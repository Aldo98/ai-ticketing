"use client";
import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

export default function SupportForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:8000/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: email, message: message }),
    });
    if (res.ok) setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-green-100">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Tiket Terkirim!</h2>
          <p className="text-gray-500 mt-2">AI kami sedang menganalisa keluhan Anda.</p>
          <button onClick={() => setSubmitted(false)} className="mt-6 text-blue-600 font-semibold">Kirim tiket lain</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-20 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Support Recovery Hub</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email Anda</label>
            <input 
              type="email" required
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-black"
              placeholder="name@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Keluhan / Masalah</label>
            <textarea 
              required rows={5}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-black"
              placeholder="Ceritakan kendala Anda..."
              value={message} onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition">
            <Send size={18} /> Kirim Tiket
          </button>
        </form>
      </div>
    </div>
  );
}