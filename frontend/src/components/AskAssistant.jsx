import { useState } from "react";
import { aiApi } from "../api/endpoints";

export default function AskAssistant({ tripPlanId }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;

    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setBusy(true);

    try {
      const { data } = await aiApi.ask({
        question: q,
        trip_plan_id: tripPlanId || null,
      });
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Sorry — I couldn't answer that just now." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-brand-700"
      >
        Ask Roamie
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[28rem] w-[22rem] flex-col rounded-xl border border-sand-300 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-sand-300 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Roamie assistant</p>
          {tripPlanId && (
            <p className="text-xs text-ink/50">Knows your itinerary</p>
          )}
        </div>
        <button onClick={() => setOpen(false)} className="text-ink/50 hover:text-ink">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-sm text-ink/55">
            <p>Ask me anything about your trip.</p>
            <div className="mt-3 space-y-1.5">
              {["What should I pack?", "Is the weather okay for day 2?", "How do I get there?"]
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuestion(s)}
                    className="block rounded-lg bg-sand-100 px-3 py-1.5 text-left text-xs hover:bg-sand-300/50"
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
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-brand-600 text-white"
                : "bg-sand-100 whitespace-pre-wrap"
            }`}
          >
            {m.text}
          </div>
        ))}

        {busy && (
          <div className="w-16 rounded-xl bg-sand-100 px-3 py-2 text-sm text-ink/50">
            …
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-sand-300 p-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-sand-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}