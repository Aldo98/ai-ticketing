"use client";
import React, { useState, useEffect } from 'react';
import { 
  Save, 
  CheckCircle, 
  RefreshCcw, 
  User, 
  Clock, 
  ShieldAlert, 
  ChevronRight,
  Search
} from 'lucide-react';

export default function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState<any>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleUpdateDraft = async () => {
    // Logika simpan tanpa menutup tiket
    try {
      const res = await fetch(`http://localhost:8000/tickets/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiDraft: draft, status: selected.status }),
      });

      if (res.ok) {
        alert("Draft updated successfully!");
        setSelected(null);
        fetchTickets(); // Refresh list
      }
    } catch (err) {
      alert("Gagal mengupdate ticket.");
    }
    // alert("Draft updated successfully!");
  };

  const handleResolve = async () => {
    if (!confirm("Finalize this ticket? It will be moved to history.")) return;
    // Logika resolve (PATCH status: RESOLVED)
    try {
      const res = await fetch(`http://localhost:8000/tickets/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiDraft: draft, status: "RESOLVED" }),
      });

      if (res.ok) {
        alert("Ticket Resolved!");
        setSelected(null);
        fetchTickets(); // Refresh list
      }
    } catch (err) {
      alert("Gagal mengupdate ticket.");
    }
    // setSelected(null);
    // fetchTickets();
  };
  const handleReprocess = async () => {
    if (!selected) return;
    if (!confirm("Ask AI to re-analyze this ticket? Current draft will be lost.")) return;
  
    try {
      const res = await fetch(`http://localhost:8000/tickets/${selected.id}/reprocess`, {
        method: 'POST',
      });
      if (res.ok) {
        // Kosongkan seleksi atau beri feedback loading
        // setSelected({ ...selected, aiDraft: null, status: 'PENDING' });
        fetchTickets(); 
      }
    } catch (err) {
      alert("Failed to trigger AI.");
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* --- SIDEBAR: TICKET LIST --- */}
      <aside className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Triage Center</h1>
            <p className="text-xs text-slate-500 font-medium">Bank-Grade Security Active</p>
          </div>
          <button onClick={fetchTickets} className="p-2 hover:bg-slate-50 rounded-lg transition text-slate-400">
            <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              className="w-full bg-slate-100 border-none rounded-md py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Search tickets..." 
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-3">
          {tickets.map((t: any) => (
            <div 
              key={t.id}
              onClick={() => { setSelected(t); setDraft(t.aiDraft || ""); }}
              className={`group mb-2 p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                selected?.id === t.id 
                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                : 'bg-white border-transparent hover:border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.urgency === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {t.urgency}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">#{t.id}</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 truncate">{t.message}</p>
              <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                  {t.userEmail[0].toUpperCase()}
                </div>
                {t.userEmail}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* --- MAIN: DETAIL VIEW --- */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {selected ? (
          <div className="p-10 max-w-5xl mx-auto w-full">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Header Detail */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-blue-600">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Ticket Review</h2>
                    <p className="text-sm text-slate-500">Category: <span className="font-semibold text-slate-700">{selected.category}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sentiment</div>
                  <div className="text-2xl font-black text-blue-600">{selected.sentiment}<span className="text-sm text-slate-300">/10</span></div>
                </div>
              </div>

              <div className="p-8">
                {/* User Message Section */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <User size={14} /> Customer Message (AES-256 Secured)
                  </h3>
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 leading-relaxed italic relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 rounded-l-xl"></div>
                    "{selected.message}"
                  </div>
                </div>

                {/* AI Draft Section */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Clock size={14} /> AI Response Draft
                  </h3>
                  <textarea 
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full h-64 p-5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition text-slate-800 leading-relaxed shadow-inner"
                    placeholder="Enter response..."
                  />
                </div>

                {/* --- BUTTON GROUP --- */}
                {selected.aiDraft ? 
                  <>
                    <div className="flex gap-4">
                      {/* UPDATE BUTTON: Biru Outline */}
                      <button 
                        onClick={handleUpdateDraft}
                        className="flex-1 flex items-center justify-center gap-2 py-4 px-6 border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all active:scale-95"
                      >
                        <Save size={20} />
                        Update Draft
                      </button>

                      {/* RESOLVE BUTTON: Hijau Solid */}
                      <button 
                        onClick={handleResolve}
                        className="flex-[2] flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                      >
                        <CheckCircle size={20} />
                        Resolve & Close Ticket
                      </button>
                    </div>
                  </>
                :
                  <>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleReprocess}
                        // disabled={selected.status === 'PENDING'}
                        className="flex-1 flex items-center justify-center gap-2 py-4 px-4 border-2 border-orange-500 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-all disabled:opacity-50"
                        title="Re-run AI Analysis"
                      >
                        <RefreshCcw size={20} className={selected.status === 'PENDING' ? "animate-spin" : ""} />
                        Retry AI
                      </button>
                    </div>
                  </>
                }
              </div>

            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 select-none">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <ChevronRight size={48} />
            </div>
            <h3 className="text-xl font-medium text-slate-400">Select a ticket to begin triage</h3>
            <p className="text-sm">Priority tasks will appear at the top of the queue.</p>
          </div>
        )}
      </main>
    </div>
  );
}