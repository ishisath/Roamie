import { useEffect, useRef, useState } from "react";
import { aiApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const SUGGESTIONS = {
  PACKAGE: [
    "What's the weather like on these dates?",
    "What should I pack for this?",
    "Is this suitable for kids?",
    "What isn't included in the price?",
  ],
  DESTINATION: [
    "When's the best time to visit?",
    "How do I get there from Colombo?",
    "What should I pack?",
    "Is it safe to swim there?",
  ],
  BOOKING: [
    "What's the weather forecast for my trip?",
    "What should I pack?",
    "What time should I be ready?",
    "What's included in what I paid?",
  ],
  PROVIDER: [
    "What languages do they speak?",
    "How experienced are they?",
    "What's their day rate?",
  ],
  TRIP_PLAN: [
    "What should I pack?",
    "Is the weather okay for day 2?",
    "How much walking is there?",
  ],
  GENERAL: [
    "Where should I go in Sri Lanka?",
    "What's the best time to visit?",
    "How much does a week cost?",
  ],
};

export default function AskAssistant({ tripPlanId, contextType, contextId, label }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  const kind = tripPlanId ? "TRIP_PLAN" : contextType || "GENERAL";
  const prompts = SUGGESTIONS[kind] || SUGGESTIONS.GENERAL;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, busy]);

  const send = async (text) => {
    const q = (text ?? question).trim();
    if (!q) return;

    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setBusy(true);

    try {
      const { data } = await aiApi.ask({
        question: q,
        trip_plan_id: tripPlanId || null,
        context_type: contextType || null,
        context_id: contextId || null,
      });
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch (err) {
      setMessages((m) => [...m, {
        role: "assistant",
        text: err.response?.status === 401
          ? "Sign in and I can answer using your bookings and plans."
          : "Sorry — I couldn't answer that just now. Try again in a moment.",
      }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-saffron-500 px-5 py-3.5 text-sm font-medium text-night-900 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] transition hover:bg-saffron-400"
      >
        <span className="text-base">✦</span>
        {label || "Ask Roamie"}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[30rem] w-[23rem] flex-col overflow-hidden rounded-2xl border border-white/12 bg-slate-800 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="font-display text-sm font-semibold text-white">
            ✦ Ask Roamie
          </p>
          <p className="text-[11px] text-white/40">
            {kind === "PACKAGE" ? "Knows this package"
              : kind === "DESTINATION" ? "Knows this destination"
              : kind === "BOOKING" ? "Knows your booking"
              : kind === "PROVIDER" ? "Knows this provider"
              : kind === "TRIP_PLAN" ? "Knows your itinerary"
              : "Ask anything about Sri Lanka"}
          </p>
        </div>
        <button onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-white/50">
              Ask me anything — I'll use what's on this page.
            </p>
            <div className="mt-3 space-y-1.5">
              {prompts.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-saffron-400/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm ${
              m.role === "user"
                ? "ml-auto bg-saffron-500 text-night-900"
                : "whitespace-pre-wrap border border-white/8 bg-white/5 text-white/85"
            }`}
          >
            {m.text}
          </div>
        ))}

        {busy && (
          <div className="flex gap-1 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2 border-t border-white/8 p-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-full border border-white/12 bg-slate-900 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-saffron-400"
        />
        <button
          disabled={busy || !question.trim()}
          className="rounded-full bg-saffron-500 px-4 text-sm font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-30"
        >
          Send
        </button>
      </form>
    </div>
  );
}