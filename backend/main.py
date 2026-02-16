from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from prisma import Prisma
from contextlib import asynccontextmanager
from openai import OpenAI
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr
from typing import Optional
from cryptography.fernet import Fernet
import os
import uvicorn
import json

db = Prisma()

load_dotenv()

# Initialize cipher
cipher = Fernet(os.getenv("ENCRYPTION_KEY").encode())

def encrypt_text(text: str) -> str:
    if not text: return ""
    return cipher.encrypt(text.encode()).decode()

def decrypt_text(encrypted_text: str) -> str:
    if not encrypted_text: return ""
    try:
        return cipher.decrypt(encrypted_text.encode()).decode()
    except Exception:
        return "[Decryption Error: Invalid Key]"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    yield
    # Shutdown
    await db.disconnect()

app = FastAPI(lifespan=lifespan)

# --- KONFIGURASI CORS ---
origins = [
    "http://localhost:3000",    # URL Next.js Anda
    "http://127.0.0.1:3000",
    # Tambahkan domain produksi Anda nanti di sini
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # Mengizinkan origin spesifik
    allow_credentials=True,
    allow_methods=["*"],               # Mengizinkan semua method (GET, POST, PATCH, dll)
    allow_headers=["*"],               # Mengizinkan semua headers
)

class TicketCreate(BaseModel):
    userEmail: EmailStr  # Validasi format email otomatis
    message: str

# Payload untuk PATCH /tickets/{id} (Update dari Agent)
class TicketUpdate(BaseModel):
    aiDraft: Optional[str] = None
    category: Optional[str] = None
    urgency: Optional[str] = None # HIGH, MEDIUM, LOW
    sentiment: Optional[int] = None
    status: Optional[str] = "RESOLVED" # Default ke RESOLVED saat agent update

async def ai_worker(ticket_id: str, message: str):
    # Simulasi AI Analysis
    # await asyncio.sleep(4) 
    prompt = f"""
    Analyze this support ticket: "{message}"
    Return ONLY a JSON object with:
    "category": (Billing, Technical, or Feature Request)
    "sentiment": (1-10)
    "urgency": (High, Medium, or Low)
    "draft": (A polite response)
    """
    # print(prompt)
    client = OpenAI(
        base_url=os.getenv('OPENAI_PROVIDER_URL'),
        api_key=os.getenv('OPENAI_API_KEY')
    )
    ai_response = client.chat.completions.create(
        model=os.getenv('OPENAI_MODEL', 'deepseek/deepseek-chat-v3-0324'),
        messages=[
            {"role": "system", "content": "You are a helpful support assistant. Output strictly JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={ "type": "json_object" } # Memastikan output JSON
    )
    if ai_response.choices==None:
        await db.ticket.update(
            where={'id': ticket_id},
            data={
                'category': None,
                'urgency': None,
                'sentiment': None,
                'aiDraft': None,
                'status': 'Pending'
            }
        )
    else:
        res = json.loads(ai_response.choices[0].message.content)
        # print(res)
    
    # Update ke PostgreSQL menggunakan Prisma
        await db.ticket.update(
            where={'id': ticket_id},
            data={
                'category': res.get('category'),
                'urgency': res.get('urgency').upper() if res.get('urgency') else 'LOW',
                'sentiment': res.get('sentiment'),
                'aiDraft': encrypt_text(res.get('draft')),
                'status': 'PROCESSED'
            }
        )

@app.post("/tickets", status_code=201)
async def create_ticket(payload: TicketCreate, background_tasks: BackgroundTasks):
    # 1. Ingest ke Postgres
    new_ticket = await db.ticket.create(
        data={
            'userEmail': payload.userEmail,
            'message': encrypt_text(payload.message),
        }
    )
    
    # 2. Trigger Background Worker
    background_tasks.add_task(ai_worker, new_ticket.id, payload.message)
    
    return {"status": "created", "id": new_ticket.id}

@app.post("/tickets/{ticket_id}/reprocess")
async def reprocess_ticket(ticket_id: str, background_tasks: BackgroundTasks):
    ticket = await db.ticket.find_unique(where={'id': ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # (Asumsi kamu punya fungsi decrypt_text dari tahap sebelumnya)
    original_message = decrypt_text(ticket.message)

    background_tasks.add_task(ai_worker, ticket.id, original_message)

    return {"status": "re-processing started"}

@app.get("/tickets")
async def list_tickets():
    tickets = await db.ticket.find_many(
        where={
            "NOT": {
                "status": "RESOLVED"
            }
        }
    )
    for t in tickets:
        t.message = decrypt_text(t.message)
        t.aiDraft = decrypt_text(t.aiDraft)
    
    priority_map = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    
    # Sorting: Urgency Tertinggi ke Terendah, lalu Sentiment Terendah (paling negatif) ke Tinggi
    sorted_tickets = sorted(
        tickets,
        key=lambda t: (
            priority_map.get(t.urgency.upper() if t.urgency else "LOW", 0),
            -(t.sentiment if t.sentiment is not None else 10) # Sentiment rendah di atas
        ),
        reverse=True
    )
    return sorted_tickets

@app.patch("/tickets/{ticket_id}")
async def edit_ticket(ticket_id: str, payload: TicketUpdate):
    # Digunakan saat Agent klik "Resolve" atau mengedit draft
    ticket = await db.ticket.update(
        where={"id": ticket_id},
        data={
            "aiDraft": encrypt_text(payload.aiDraft),
            "status": payload.status
        }
    )
    return {"message": "Ticket updated successfully", "ticket": ticket}

if __name__ == "__main__":
    # Ganti 'main' dengan nama file kamu jika namanya bukan main.py
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)