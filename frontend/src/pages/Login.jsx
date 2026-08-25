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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "TRAVELER" ? "/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your details.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative bg-brand-700">
        <img
          src="https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?w=1400"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="relative z-10 flex h-full flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-semibold leading-tight">
            Sri Lanka,<br />on your terms.
          </h2>
          <p className="mt-3 max-w-sm text-sand-100/90">
            Choose your own guide, your own driver, your own pace.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="text-2xl font-bold tracking-tight text-brand-600">
            Roamie
          </Link>
          <h1 className="mt-8 text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-ink/60">Sign in to continue planning.</p>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={change}
                className="mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={change}
                className="mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-ink/60">
            No account?{" "}
            <Link to="/register" className="font-medium text-brand-600 hover:underline">
              Create one
            </Link>
          </p>

          <div className="mt-8 rounded-lg bg-sand-100 p-4 text-xs text-ink/70">
            <p className="font-medium">Demo accounts</p>
            <p className="mt-1">me@test.com / test1234 — Traveler</p>
            <p>kamal@roamie.com / Guide@1234 — Guide</p>
            <p>admin@roamie.com / Admin@1234 — Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}