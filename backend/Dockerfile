FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and Node.js for Prisma CLI
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g prisma \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN prisma generate


# Copy Env
COPY .env ./

# Copy application code
COPY main.py .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
