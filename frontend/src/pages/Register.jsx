import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "TRAVELER", label: "Traveler", desc: "Discover and book trips" },
  { value: "GUIDE", label: "Tour Guide", desc: "Offer tours and packages" },
  { value: "DRIVER", label: "Driver", desc: "Provide transport" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    country: "Sri Lanka",
    role: "TRAVELER",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="text-2xl font-bold tracking-tight text-brand-600">
          Roamie
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Create your account</h1>

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">I am a…</label>
            <div className="mt-2 grid gap-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    form.role === r.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-sand-300 bg-white hover:border-sand-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={change}
                    className="mt-1 accent-brand-600"
                  />
                  <span>
                    <span className="block text-sm font-medium">{r.label}</span>
                    <span className="block text-xs text-ink/60">{r.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Full name</label>
            <input name="full_name" required value={form.full_name}
                   onChange={change} className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input name="email" type="email" required value={form.email}
                   onChange={change} className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input name="password" type="password" required value={form.password}
                   onChange={change} className={field}
                   placeholder="At least 8 characters" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input name="phone" value={form.phone} onChange={change} className={field} />
            </div>
            <div>
              <label className="block text-sm font-medium">Country</label>
              <input name="country" value={form.country} onChange={change} className={field} />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink/60">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}