import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { providersApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ReviewList from "../components/ReviewList";

export default function ProviderProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    providersApi.profile(userId)
      .then((r) => setP(r.data))
      .catch(() => setError("We couldn't find that provider."));
  }, [userId]);

  if (error) {
    return (
      <div className="min-h-screen bg-night-900">
        <Navbar />
        <p className="py-40 text-center text-white/60">{error}</p>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="min-h-screen bg-night-900">
        <Navbar />
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="h-72 animate-pulse rounded-[18px] bg-night-800" />
        </div>
      </div>
    );
  }

  const isDriver = p.vehicles?.length > 0 || !p.specializations;
  const subjectType = isDriver ? "DRIVER" : "GUIDE";

  const book = () => {
    if (!user) return navigate("/login");
    navigate(`/book/provider/${p.user_id}?type=${subjectType}`);
  };

  return (
    <div className="min-h-screen bg-night-900">
      <Navbar />

      {/* header */}
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/45 via-night-900 to-night-900" />
        <div className="pointer-events-none absolute -left-24 -top-10 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-16">
          <div className="flex flex-wrap items-start gap-6">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full
                             bg-gradient-to-br from-saffron-400 to-saffron-600
                             font-display text-4xl font-bold text-night-900">
              {p.full_name.charAt(0)}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="headline text-[clamp(2rem,4.5vw,3.25rem)] text-white">
                  {p.full_name}
                </h1>
                {p.is_verified && (
                  <span className="rounded-full bg-brand-500/25 px-3 py-1 text-xs font-semibold text-brand-200">
                    ✓ ADMIN VERIFIED
                  </span>
                )}
              </div>
              <p className="mt-1 text-white/55">
                {subjectType === "GUIDE" ? "Tour guide" : "Driver"}
                {p.country && ` · ${p.country}`}
              </p>

              <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
                {p.rating_avg > 0 && (
                  <div>
                    <p className="eyebrow text-white/40">Rating</p>
                    <p className="mt-1 font-display text-xl font-bold text-white">
                      {Number(p.rating_avg).toFixed(1)}
                      <span className="ml-1 text-saffron-500">★</span>
                      <span className="ml-1.5 text-sm font-normal text-white/40">
                        ({p.rating_count})
                      </span>
                    </p>
                  </div>
                )}
                <div>
                  <p className="eyebrow text-white/40">Experience</p>
                  <p className="mt-1 font-display text-xl font-bold text-white">
                    {p.years_experience} years
                  </p>
                </div>
                {p.languages?.length > 0 && (
                  <div>
                    <p className="eyebrow text-white/40">Languages</p>
                    <p className="mt-1 font-display text-xl font-bold text-white">
                      {p.languages.length}
                    </p>
                  </div>
                )}
                {p.daily_rate > 0 && (
                  <div>
                    <p className="eyebrow text-white/40">Day rate</p>
                    <p className="mt-1 font-display text-xl font-bold text-saffron-400">
                      LKR {Number(p.daily_rate).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-5xl gap-12 px-6 py-14 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {p.bio && (
            <p className="text-lg leading-relaxed text-white/80">{p.bio}</p>
          )}

          <div className="grid gap-8 sm:grid-cols-2">
            {p.languages?.length > 0 && (
              <div>
                <h3 className="eyebrow text-saffron-400">Speaks</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.languages.map((l) => (
                    <span key={l} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {p.specializations?.length > 0 && (
              <div>
                <h3 className="eyebrow text-saffron-400">Specialises in</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.specializations.map((s) => (
                    <span key={s} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {p.qualifications && (
            <div className="rounded-2xl border border-white/10 bg-night-800/50 p-5">
              <h3 className="eyebrow text-saffron-400">Qualifications</h3>
              <p className="mt-2 text-white/75">{p.qualifications}</p>
              {p.certifications && (
                <p className="mt-1 text-sm text-white/55">{p.certifications}</p>
              )}
            </div>
          )}

          {p.vehicles?.length > 0 && (
            <div>
              <h3 className="eyebrow text-saffron-400">Fleet</h3>
              <div className="mt-4 space-y-4">
                {p.vehicles.map((v) => (
                  <div key={v.id} className="overflow-hidden rounded-[18px] border border-white/10 bg-night-800/50">
                    {v.photos?.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto">
                        {v.photos.map((url) => (
                          <img key={url} src={url} alt=""
                               className="h-44 w-64 shrink-0 object-cover" />
                        ))}
                      </div>
                    )}
                    <div className="p-5">
                      <p className="font-display text-lg font-semibold text-white">
                        {v.vehicle_type}{v.model && ` · ${v.model}`}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                        <span className="text-white/60">
                          <span className="text-white/40">Seats </span>{v.seats}
                        </span>
                        <span className="text-white/60">
                          <span className="text-white/40">Climate </span>
                          {v.is_ac ? "Air conditioned" : "Non-AC"}
                        </span>
                        {v.luggage_capacity && (
                          <span className="text-white/60">
                            <span className="text-white/40">Luggage </span>{v.luggage_capacity}
                          </span>
                        )}
                      </div>
                      {v.facilities?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {v.facilities.map((f) => (
                            <span key={f} className="rounded-full border border-white/12 px-2.5 py-0.5 text-xs text-white/60">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.packages?.length > 0 && (
            <div>
              <h3 className="eyebrow text-saffron-400">Packages</h3>
              <div className="mt-4 space-y-2">
                {p.packages.map((pk) => (
                  <Link
                    key={pk.id}
                    to={`/packages/${pk.id}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10
                               bg-night-800/50 p-5 transition hover:border-white/25 hover:bg-night-800"
                  >
                    <div>
                      <p className="font-display font-semibold text-white">{pk.title}</p>
                      <p className="mt-0.5 text-xs text-white/45">
                        {pk.duration_days} day{pk.duration_days > 1 ? "s" : ""} ·{" "}
                        {pk.transport_included ? "Transport included" : "No transport"}
                      </p>
                    </div>
                    <span className="font-display font-semibold text-saffron-400">
                      {pk.currency} {Number(pk.price).toLocaleString()}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ReviewList type={subjectType} id={p.user_id} dark />
        </div>

        <aside>
          <div className="sticky top-24 rounded-[18px] border border-white/12 bg-night-800/80 p-6 backdrop-blur">
            <h3 className="font-display text-lg font-semibold text-white">Availability</h3>
            {p.available_dates.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">
                Fully booked for the next 60 days.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/55">
                  {p.available_dates.length} days free in the next two months.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.available_dates.slice(0, 14).map((d) => (
                    <span key={d} className="rounded-lg bg-white/8 px-2 py-1 text-xs text-white/70">
                      {new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  ))}
                  {p.available_dates.length > 14 && (
                    <span className="px-2 py-1 text-xs text-white/35">
                      +{p.available_dates.length - 14}
                    </span>
                  )}
                </div>
              </>
            )}

            {p.daily_rate > 0 && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="eyebrow text-white/40">Day rate</p>
                <p className="mt-1 font-display text-3xl font-bold text-white">
                  <span className="text-base font-medium text-white/50">LKR </span>
                  {Number(p.daily_rate).toLocaleString()}
                </p>
              </div>
            )}

            <button
              onClick={book}
              className="mt-6 w-full rounded-full bg-saffron-500 py-3.5 font-medium text-night-900 transition hover:bg-saffron-400"
            >
              {user ? `Book this ${subjectType.toLowerCase()}` : "Sign in to book"}
            </button>
            <p className="mt-3 text-center text-xs text-white/40">
              You're choosing this {subjectType.toLowerCase()} directly.
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}