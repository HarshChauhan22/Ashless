"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell, Button } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { DISCLAIMER, openingMessage } from "@/lib/ai-coach";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_REPLIES = ["It's about stress", "I want to smoke anyway", "I feel fine now"];

export default function CoachPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Message[]>("/api/ai-coach").then((res) => {
      if (res.ok && res.data.length > 0) {
        setMessages(res.data);
      } else {
        // First open — the coach speaks first, never a blank box waiting on the user.
        setMessages([{ id: "opening", role: "assistant", content: openingMessage({}) }]);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: text }]);
    const res = await apiFetch<Message>("/api/ai-coach", { method: "POST", body: { content: text } });
    setSending(false);
    if (res.ok) {
      setMessages((m) => [...m, res.data]);
    } else {
      setMessages((m) => [...m, { id: "error", role: "assistant", content: "Coach is having trouble connecting. Try the breathing exercise instead?" }]);
    }
  }

  function logRelapseAndExit() {
    router.push("/craving/relapse");
  }

  async function goToSmokingRoom() {
    const res = await apiFetch<{ id: string }>("/api/craving-sessions", { method: "POST", body: { entryPoint: "ai_coach" } });
    if (res.ok) router.push(`/craving/smoking-room?cravingSessionId=${res.data.id}`);
  }

  return (
    <ScreenShell>
      <div className="flex h-full flex-col">
        <h1 className="mb-1 text-xl font-semibold text-ink-900">AI Coach</h1>
        <p className="mb-4 text-xs text-ink-300">{DISCLAIMER}</p>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-md px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-redirect-600 text-white" : "border border-line-200 bg-surface-0 text-ink-900"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="whitespace-nowrap rounded-pill border border-line-200 bg-surface-0 px-3 py-1.5 text-xs font-medium text-ink-600"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Type a message…"
            className="flex-1 rounded-pill border border-line-200 bg-surface-0 px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-300"
          />
          <Button variant="redirect" className="w-auto px-5" onClick={() => send(input)}>
            Send
          </Button>
        </div>

        <div className="mt-3 flex gap-3 text-xs">
          <button className="font-medium text-redirect-600 underline" onClick={goToSmokingRoom}>
            Go to Smoking Room instead
          </button>
          <button className="font-medium text-ink-600 underline" onClick={logRelapseAndExit}>
            I already smoked
          </button>
        </div>
      </div>
    </ScreenShell>
  );
}
