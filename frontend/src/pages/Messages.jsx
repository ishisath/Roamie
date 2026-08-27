import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { messagesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { DashShell } from "../components/DashShell";

export default function Messages() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const active = threads.find((t) => t.booking_id === bookingId);

  useEffect(() => {
    messagesApi.threads()
      .then((r) => setThreads(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
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
      messagesApi.threads().then((r) => setThreads(r.data)).catch(() => {});
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const grouped = messages.reduce((acc, m) => {
    const day = new Date(m.sent_at || m.created_at).toDateString();
    (acc[day] ||= []).push(m);
    return acc;
  }, {});

  const dayLabel = (d) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (d === today) return "Today";
    if (d === yesterday) return "Yesterday";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);

  const avatar = (name, role, size = "h-11 w-11 text-base") =>
    `flex ${size} shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${
      role === "DRIVER"
        ? "bg-gradient-to-br from-plum-500 to-plum-600"
        : "bg-gradient-to-br from-brand-500 to-brand-700"
    }`;

  return (
    <DashShell
      eyebrow="Conversations"
      title="Messages"
      subtitle={totalUnread > 0
        ? `${totalUnread} unread message${totalUnread > 1 ? "s" : ""}`
        : "Messaging opens once a booking is confirmed"}
      tabs={["Inbox"]}
      tab="Inbox"
      setTab={() => {}}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {/* threads */}
        <aside className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-800/70 backdrop-blur">
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-display font-semibold text-white">No conversations</p>
                <p className="mt-1.5 text-sm text-white/45">
                  Once a booking is confirmed you can message your guide or driver here.
                </p>
                <Link to="/packages"
                      className="mt-4 inline-block rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10">
                  Browse packages
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-white/8">
                {threads.map((t) => {
                  const on = t.booking_id === bookingId;
                  return (
                    <li key={t.booking_id}>
                      <button
                        onClick={() => navigate(`/messages/${t.booking_id}`)}
                        className={`flex w-full items-start gap-3 px-4 py-4 text-left transition ${
                          on ? "bg-saffron-500/10" : "hover:bg-white/5"
                        }`}
                      >
                        <span className={avatar(t.other_party_name, t.other_party_role)}>
                          {t.other_party_name.charAt(0)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-display font-semibold text-white">
                              {t.other_party_name}
                            </span>
                            {t.unread > 0 && (
                              <span className="shrink-0 rounded-full bg-saffron-500 px-1.5 py-0.5 text-[10px] font-bold text-night-900">
                                {t.unread}
                              </span>
                            )}
                          </span>
                          <span className="block text-[11px] uppercase tracking-wide text-white/35">
                            {t.other_party_role.toLowerCase()} · {t.reference}
                          </span>
                          {t.last_message && (
                            <span className={`mt-1 block truncate text-sm ${
                              t.unread > 0 ? "font-medium text-white" : "text-white/45"
                            }`}>
                              {t.last_message}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* conversation */}
        <section className="lg:col-span-2">
          {!bookingId ? (
            <div className="flex h-[34rem] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12">
              <p className="font-display text-lg font-semibold text-white">
                Pick a conversation
              </p>
              <p className="mt-1 text-sm text-white/40">
                Your messages are kept per booking.
              </p>
            </div>
          ) : (
            <div className="flex h-[34rem] flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-800/70 backdrop-blur">
              <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
                <span className={avatar(active?.other_party_name || "?",
                                        active?.other_party_role, "h-10 w-10 text-sm")}>
                  {active?.other_party_name?.charAt(0) || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-white">
                    {active?.other_party_name || "Conversation"}
                  </p>
                  <p className="text-xs text-white/40">
                    {active?.other_party_role?.toLowerCase()}
                  </p>
                </div>
                {active?.reference && (
                  <Link to={`/bookings/${bookingId}`}
                        className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 font-mono text-xs text-white/70 hover:bg-white/10">
                    {active.reference}
                  </Link>
                )}
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {messages.length === 0 && (
                  <p className="py-16 text-center text-sm text-white/40">
                    No messages yet. Say hello, or ask about pickup times.
                  </p>
                )}

                {Object.entries(grouped).map(([day, items]) => (
                  <div key={day} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-white/8" />
                      <span className="text-[11px] uppercase tracking-wide text-white/35">
                        {dayLabel(day)}
                      </span>
                      <span className="h-px flex-1 bg-white/8" />
                    </div>

                    {items.map((m) => {
                      const mine = m.sender_id === user.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
                          <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                            mine
                              ? "rounded-br-md bg-saffron-500 text-night-900"
                              : "rounded-bl-md border border-white/10 bg-white/8 text-white"
                          }`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {m.body}
                            </p>
                            <p className={`mt-1 text-[10px] ${
                              mine ? "text-night-900/50" : "text-white/35"
                            }`}>
                              {m.sent_at &&
                                new Date(m.sent_at).toLocaleTimeString("en-GB", {
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              {mine && m.read_at && " · read"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="flex gap-2 border-t border-white/8 p-3">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message…"
                  className="flex-1 rounded-full border border-white/12 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-saffron-400"
                />
                <button
                  disabled={sending || !body.trim()}
                  className="rounded-full bg-saffron-500 px-6 text-sm font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-30"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </DashShell>
  );
}