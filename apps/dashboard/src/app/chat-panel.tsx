"use client";

import { useEffect, useRef, useState } from "react";
import { agentChat, type AgentAction, type AgentChatMessage } from "@/lib/api";

interface ChatMessage extends AgentChatMessage {
  id: string;
  actions?: AgentAction[];
  error?: boolean;
}

interface ChatPanelProps {
  onRefresh?: () => void;
}

export function ChatPanel({ onRefresh }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    // Build history from existing messages (role + content only)
    const history: AgentChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await agentChat(text, history);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        actions: res.actions ?? [],
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh dashboard if a logbook entry was created
      const didLog = (res.actions ?? []).some(
        (a) => a.type === "logbook_entry_created"
      );
      if (didLog && onRefresh) onRefresh();
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content:
          err instanceof Error
            ? `Sorry, I couldn't reach the agent: ${err.message}`
            : "Sorry, something went wrong.",
        error: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Toggle button — sits above the bottom nav (h~64px) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed right-4 z-[60] w-14 h-14 rounded-full bg-status-blue text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed right-4 z-[55] w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-12rem)] bg-navy-surface border border-navy-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 150px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-border bg-navy">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-green" />
              <h3 className="text-sm font-semibold text-slate-text">
                Compliance Assistant
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-slate-muted hover:text-slate-text transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
          >
            {messages.length === 0 && (
              <EmptyState onSuggest={(s) => setInput(s)} />
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {sending && <TypingIndicator />}
          </div>

          {/* Input */}
          <div className="border-t border-navy-border px-3 py-3 bg-navy">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about compliance, log a drill…"
                disabled={sending}
                className="flex-1 bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text placeholder:text-slate-muted focus:outline-none focus:ring-2 focus:ring-status-blue/50 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="bg-status-blue text-white rounded-lg px-3 py-2 min-w-[44px] min-h-[40px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
            isUser
              ? "bg-status-blue text-white rounded-br-sm"
              : message.error
              ? "bg-status-red/15 border border-status-red/40 text-status-red rounded-bl-sm"
              : "bg-navy border border-navy-border text-slate-text rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {message.actions.map((a, i) => (
              <ActionBadge key={i} action={a} />
            ))}
          </div>
        )}
        {!isUser && !message.error && (
          <span className="text-[10px] text-slate-muted/60 mt-0.5">Powered by Nebius</span>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: AgentAction }) {
  const label = formatAction(action);
  return (
    <span className="inline-flex items-center text-[11px] leading-tight px-2 py-0.5 rounded-full bg-navy-border/60 text-slate-muted border border-navy-border">
      {label}
    </span>
  );
}

function formatAction(action: AgentAction): string {
  const d = action.data || {};
  switch (action.type) {
    case "logbook_entry_created": {
      const title =
        typeof d.title === "string" ? d.title : "Entry";
      return `📋 Logged: ${title}`;
    }
    case "compliance_checked":
      return "📊 Checked compliance status";
    case "regulation_searched": {
      const query =
        typeof d.query === "string"
          ? d.query
          : typeof d.citation === "string"
          ? d.citation
          : "regulation";
      return `🔍 Searched: ${query}`;
    }
    default:
      return String(action.type);
  }
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-navy border border-navy-border rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-slate-muted flex items-center gap-2">
        <span className="flex gap-1">
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </span>
        <span className="text-xs">Agent is thinking…</span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-slate-muted animate-pulse"
      style={{ animationDelay: delay }}
    />
  );
}

function EmptyState({ onSuggest }: { onSuggest: (s: string) => void }) {
  const suggestions = [
    "Log a fire drill",
    "What's overdue?",
    "Look up 46 CFR 78.37",
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-6 gap-3">
      <div className="w-12 h-12 rounded-full bg-status-blue/10 border border-status-blue/30 flex items-center justify-center text-status-blue">
        <ChatIcon />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-text">
          Compliance Assistant
        </p>
        <p className="text-xs text-slate-muted mt-1">
          Log entries, check regulations, ask anything.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggest(s)}
            className="text-xs px-2.5 py-1 rounded-full bg-navy border border-navy-border text-slate-text hover:border-status-blue/50 hover:text-status-blue transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
