import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const homeFor = (role) =>
    role === "GUIDE" ? "/guide" : role === "DRIVER" ? "/driver"
    : role === "ADMIN" ? "/admin" : "/dashboard";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err.response?.data?.detail || "That email and password don't match.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1.5 w-full rounded-lg border border-white/12 bg-white/8 px-4 py-3 text-white placeholder:text-white/35 outline-none backdrop-blur focus:border-saffron-400";

  return (
    <div className="grid min-h-screen bg-night-900 lg:grid-cols-2">
      {/* photo side */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="/destinations/ella.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/35 to-night-900/25" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-white"
                style={{ fontVariationSettings: '"wdth" 92' }}>
            ROAMIE
          </Link>
          <div>
            <span className="eyebrow text-saffron-400">Sri Lanka</span>
            <h2 className="headline mt-3 text-5xl uppercase leading-none text-white">
              Your trip.<br />Your call.
            </h2>
            <p className="mt-4 max-w-sm text-white/60">
              Pick your own guide, your own driver, your own pace.
            </p>
          </div>
        </div>
      </div>

      {/* form side */}
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-white lg:hidden"
                style={{ fontVariationSettings: '"wdth" 92' }}>
            ROAMIE
          </Link>

          <span className="eyebrow mt-10 block text-saffron-400 lg:mt-0">Welcome back</span>
          <h1 className="headline mt-2 text-4xl text-white">Sign in</h1>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="eyebrow text-white/45">Email</label>
              <input name="email" type="email" required value={form.email}
                     onChange={change} placeholder="you@example.com" className={field} />
            </div>
            <div>
              <label className="eyebrow text-white/45">Password</label>
              <input name="password" type="password" required value={form.password}
                     onChange={change} placeholder="••••••••" className={field} />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-saffron-500 py-3.5 font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-7 text-sm text-white/50">
            No account?{" "}
            <Link to="/register" className="font-medium text-saffron-400 hover:underline">
              Create one
            </Link>
          </p>

          <div className="mt-10 rounded-xl border border-white/8 bg-white/4 p-4">
            <p className="eyebrow text-white/40">Demo accounts</p>
            <div className="mt-2.5 space-y-1 font-mono text-xs text-white/55">
              <p>me@test.com · test1234</p>
              <p>kamal@roamie.com · Guide@1234</p>
              <p>sunil@roamie.com · Driver@1234</p>
              <p>admin@roamie.com · Admin@1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}