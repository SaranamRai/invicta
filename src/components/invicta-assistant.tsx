"use client";

import { FormEvent, useState } from "react";
import { Bot, Headphones, Send, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

type AssistantReply = {
  reply: string;
  suggestions: string[];
};

type ChatMessage = { role: "assistant" | "user"; text: string };

const quickActions = ["What sports are available?", "Show today's fixtures", "What matches are live?"];
const welcome = "Hello! I’m the INVICTA AI Assistant. I can answer questions using the current public INVICTA data.";

export function InvictaAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: welcome }]);

  async function sendMessage(message: string) {
    const cleanMessage = message.replace(/[<>\u0000-\u001F\u007F]/g, " ").trim().slice(0, 500);
    if (!cleanMessage || isSending) return;
    setMessages((current) => [...current, { role: "user", text: cleanMessage }]);
    setInput("");
    setIsSending(true);

    try {
      const answer = await apiFetch<AssistantReply>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: cleanMessage,
          history: messages.slice(-8).map((item) => ({ role: item.role, content: item.text })),
        }),
      });
      setMessages((current) => [...current, { role: "assistant", text: answer.reply }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "I can’t reach the public schedule right now. Please try again shortly." }]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="fixed bottom-20 right-4 z-[70] font-sans sm:bottom-24 sm:right-6">
      {isOpen && (
        <section className="mb-3 flex h-[min(38rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-[#f4c35a]/30 bg-slate-950 text-white shadow-2xl shadow-black/40">
          <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1d2939] to-[#0b1220] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4c35a] text-slate-950"><Bot size={20} /></span>
              <div><h2 className="text-sm font-black">INVICTA AI Assistant</h2><p className="text-[10px] font-bold uppercase tracking-wider text-[#f4c35a]">Current event data</p></div>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="Close Invicta Assistant" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-8" : "mr-4"}>
                <div className={`rounded-2xl px-3 py-2.5 text-sm leading-5 ${message.role === "user" ? "bg-[#e5ad3b] text-slate-950" : "bg-white/10 text-white/90"}`}>{message.text}</div>
              </div>
            ))}
            {isSending && <div className="mr-12 rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/60">Checking the public schedule…</div>}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {quickActions.map((action) => <button key={action} onClick={() => void sendMessage(action)} className="whitespace-nowrap rounded-full border border-[#f4c35a]/30 px-2.5 py-1 text-[10px] font-bold text-[#f4c35a] hover:bg-[#f4c35a]/10">{action}</button>)}
            </div>
            <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-xl bg-white/10 p-1.5">
              <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} placeholder="Ask about INVICTA…" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-white/40" />
              <button disabled={isSending} aria-label="Send message" className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4c35a] text-slate-950 disabled:opacity-50"><Send size={15} /></button>
            </form>
          </div>
        </section>
      )}
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Open INVICTA AI Assistant"
        title="INVICTA AI Assistant"
        className="group relative grid h-14 w-14 place-items-center rounded-full border-4 border-slate-950 bg-[#e5ad3b] text-slate-950 shadow-xl shadow-black/30 transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#e5ad3b]/40"
      >
        <Headphones size={39} strokeWidth={2.2} className="absolute" />
        <Bot size={21} strokeWidth={2.6} className="relative rounded-full bg-[#e5ad3b] p-0.5" />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
        <span className="sr-only">AI Assistant</span>
      </button>
    </div>
  );
}
