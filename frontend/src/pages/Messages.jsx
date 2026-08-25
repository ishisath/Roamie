import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { messagesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function Messages() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const active = threads.find((t) => t.booking_id === bookingId);

  useEffect(() => {
    messagesApi.threads().then((r) => setThreads(r.data)).catch(() => {});
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;

    const load = () =>
      messagesApi.list(bookingId).then((r) => setMessages(r.data)).catch(() => {});

    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const { data } = await messagesApi.send(bookingId, text);
      setMessages((m) => [...m, data]);
      setBody("");
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold">Messages</h1>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <aside className="md:col-span-1">
            <div className="rounded-xl border border-sand-300 bg-white">
              {threads.length === 0 ? (
                <p className="p-5 text-sm text-ink/55">
                  No conversations yet. Messaging opens once a booking is confirmed.
                </p>
              ) : (
                <ul className="divide-y divide-sand-300">
                  {threads.map((t) => (
                    <li key={t.booking_id}>
                      <button
                        onClick={() => navigate(`/messages/${t.booking_id}`)}
                        className={`w-full px-4 py-3 text-left transition hover:bg-sand-50 ${
                          t.booking_id === bookingId ? "bg-sand-100" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{t.other_party_name}</span>
                          {t.unread > 0 && (
                            <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
                              {t.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink/50">
                          {t.other_party_role.toLowerCase()} · {t.reference}
                        </p>
                        {t.last_message && (
                          <p className="mt-1 truncate text-xs text-ink/60">{t.last_message}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <section className="md:col-span-2">
            {!bookingId ? (
              <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-sand-300 text-sm text-ink/50">
                Pick a conversation
              </div>
            ) : (
              <div className="flex h-[32rem] flex-col rounded-xl border border-sand-300 bg-white">
                <div className="border-b border-sand-300 px-5 py-3">
                  <p className="font-medium">{active?.other_party_name || "Conversation"}</p>
                  <p className="text-xs text-ink/50">{active?.reference}</p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-ink/45">
                      No messages yet — say hello.
                    </p>
                  )}
                  {messages.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
                          mine ? "ml-auto bg-brand-600 text-white" : "bg-sand-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-ink/45"}`}>
                          {m.sent_at &&
                            new Date(m.sent_at).toLocaleString("en-GB", {
                              day: "numeric", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          {mine && m.read_at && " · read"}
                        </p>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={send} className="flex gap-2 border-t border-sand-300 p-3">
                  <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write a message…"
                    className="flex-1 rounded-lg border border-sand-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <button
                    disabled={sending}
                    className="rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}