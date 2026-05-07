"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import clsx from "clsx";

export default function ChatKia() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === "submitted" || status === "streaming";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage({ text: chatInput });
    setChatInput("");
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          "fixed bottom-24 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-purple-500 to-[var(--accent)] text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:scale-105 transition-all duration-300 flex items-center justify-center",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
        title="Hablar con Kia"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-2 -left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border-2 border-[var(--bg-primary)]">
          IA
        </span>
      </button>

      {/* Chat Window */}
      <div
        className={clsx(
          "fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-32px)] bg-[var(--bg-primary)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[0_20px_50px_rgb(0,0,0,0.5)] flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-[var(--accent)] text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Kia</h3>
              <p className="text-[10px] text-white/80 uppercase tracking-wider font-semibold">Experta Gastronómica</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-surface)]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-70">
              <Bot className="w-12 h-12 text-[var(--accent)] mb-4 opacity-50" />
              <p className="text-sm text-[var(--text-primary)] font-medium mb-1">¡Hola! Soy Kia 👋</p>
              <p className="text-xs text-[var(--text-secondary)]">Conozco todos los restaurantes de la plataforma. ¿Qué te gustaría comer hoy?</p>
            </div>
          ) : (
            messages.map((m) => (
              <div 
                key={m.id} 
                className={clsx(
                  "flex flex-col max-w-[85%]",
                  m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                  {m.role === "user" ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Tú</span>
                      <User className="w-3 h-3 text-[var(--text-dim)]" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-purple-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Kia</span>
                    </>
                  )}
                </div>
                <div 
                  className={clsx(
                    "p-3 rounded-2xl text-sm leading-relaxed",
                    m.role === "user" 
                      ? "bg-[var(--accent)] text-white rounded-tr-sm" 
                      : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-sm shadow-sm"
                  )}
                >
                  {m.parts?.map((part, index) => {
                    if (part.type === "text") {
                      return <span key={index}>{part.text}</span>;
                    }
                    return null;
                  })}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 mr-auto bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3 rounded-2xl rounded-tl-sm w-fit shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form 
          onSubmit={handleChatSubmit} 
          className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] flex gap-2 shrink-0"
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Pregúntale algo a Kia..."
            className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-[var(--text-primary)]"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !chatInput.trim()}
            className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:hover:scale-100 hover:scale-105 transition-all shadow-md"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </>
  );
}
