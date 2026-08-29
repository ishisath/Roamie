import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { profileApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, Pill } from "../components/DashShell";
import ImageUpload from "../components/ImageUpload";

const LANGUAGES = ["English", "Sinhala", "Tamil", "German", "French",
                   "Russian", "Chinese", "Japanese", "Hindi"];

const SPECIALISATIONS = ["Cultural", "Wildlife", "Hiking", "Beach", "Adventure",
                         "Photography", "Food", "History", "Wellness", "Birdwatching"];

export default function ProviderSetup() {
  const { user } = useAuth();
  const isGuide = user?.role === "GUIDE";

  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [account, setAccount] = useState({ full_name: "", phone: "", country: "" });
  const [avatar, setAvatar] = useState([]);
  const [docs, setDocs] = useState([]);

  const [form, setForm] = useState({
    bio: "", years_experience: "", daily_rate: "",
    languages: [], specializations: [],
    qualifications: "", certifications: "",
    sltda_registered: false, sltda_number: "",
    license_no: "", license_expiry: "",
  });

  const load = () =>
    profileApi.me().then((r) => {
      const p = r.data;
      setProfile(p);
      setAccount({
        full_name: p.full_name || "",
        phone: p.phone || "",
        country: p.country || "",
      });
      setAvatar(p.avatar_url ? [p.avatar_url] : []);
      setDocs(p.verification_docs || []);
      setForm({
        bio: p.bio || "",
        years_experience: p.years_experience ?? "",
        daily_rate: p.daily_rate ?? "",
        languages: p.languages || [],
        specializations: p.specializations || [],
        qualifications: p.qualifications || "",
        certifications: p.certifications || "",
        sltda_registered: p.sltda_registered || false,
        sltda_number: p.sltda_number || "",
        license_no: p.license_no || "",
        license_expiry: p.license_expiry || "",
      });
    }).catch(() => setError("Couldn't load your profile."));

  useEffect(() => { load(); }, []);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const toggle = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((x) => x !== value)
        : [...f[field], value],
    }));

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaved("");
    setSaving(true);

    try {
      await profileApi.updateAccount({
        full_name: account.full_name,
        phone: account.phone || null,
        country: account.country || null,
        avatar_url: avatar[0] || null,
      });

      const payload = isGuide ? {
        bio: form.bio || null,
        years_experience: form.years_experience ? Number(form.years_experience) : null,
        languages: form.languages,
        specializations: form.specializations,
        qualifications: form.qualifications || null,
        certifications: form.certifications || null,
        sltda_registered: form.sltda_registered,
        sltda_number: form.sltda_number || null,
        daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
        verification_docs: docs,
      } : {
        bio: form.bio || null,
        years_experience: form.years_experience ? Number(form.years_experience) : null,
        languages: form.languages,
        license_no: form.license_no || null,
        license_expiry: form.license_expiry || null,
        daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
        verification_docs: docs,
      };

      const { data } = isGuide
        ? await profileApi.updateGuide(payload)
        : await profileApi.updateDriver(payload);

      setProfile(data);
      setSaved("Saved.");
      setTimeout(() => setSaved(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError("");
    try {
      const { data } = await profileApi.submit();
      setProfile(data);
      setSaved("Submitted for review. We'll email you when an admin decides.");
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't submit yet.");
    }
  };

  const field =
    "mt-1.5 w-full rounded-lg border border-white/12 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-saffron-400";

  if (!profile) {
    return (
      <DashShell eyebrow="Your profile" title="Profile"
                 tabs={["Profile"]} tab="Profile" setTab={() => {}}>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-800/70" />
      </DashShell>
    );
  }

  const ready = profile.completeness === 100;
  const statusTone = {
    APPROVED: "brand", REJECTED: "danger",
    CHANGES_REQUESTED: "saffron", PENDING: "saffron",
  }[profile.verification_status];

  return (
    <DashShell
      eyebrow={isGuide ? "Guide profile" : "Driver profile"}
      title="Your profile"
      subtitle="Travellers see this before they book you"
      tabs={["Profile"]}
      tab="Profile"
      setTab={() => {}}
      right={<Pill tone={statusTone}>{profile.verification_status}</Pill>}
    >
      {error && (
        <div className="mb-5 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-5 rounded-lg border border-brand-400/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
          {saved}
        </div>
      )}

      {/* status banner */}
      {profile.verification_status === "APPROVED" ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-400/25 bg-brand-500/10 p-5">
          <div>
            <p className="font-display font-semibold text-white">You're verified</p>
            <p className="mt-1 text-sm text-white/60">
              Travellers can find and book you. Changes here go live straight away.
            </p>
          </div>
          <Link to={`/providers/${profile.user_id}`}
                className="rounded-full border border-white/20 px-5 py-2 text-sm text-white hover:bg-white/10">
            View public profile
          </Link>
        </div>
      ) : profile.verification_status === "REJECTED" ||
        profile.verification_status === "CHANGES_REQUESTED" ? (
        <div className="mb-5 rounded-2xl border border-clay-500/30 bg-clay-500/10 p-5">
          <p className="font-display font-semibold text-white">
            {profile.verification_status === "REJECTED"
              ? "Your application wasn't approved"
              : "An admin needs more from you"}
          </p>
          {profile.admin_note && (
            <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/75">
              “{profile.admin_note}”
            </p>
          )}
          <p className="mt-2 text-sm text-white/55">
            Update what's below and save — you'll go back into the review queue.
          </p>
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-saffron-500/30 bg-saffron-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-white">
                Profile {profile.completeness}% complete
              </p>
              <p className="mt-1 text-sm text-white/60">
                {ready
                  ? "Everything's filled in. Submit for review to start taking bookings."
                  : "An admin verifies your profile before you can take bookings."}
              </p>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-saffron-500 transition-[width] duration-700"
                     style={{ width: `${profile.completeness}%` }} />
              </div>

              {profile.missing.length > 0 && (
                <p className="mt-3 text-xs text-white/50">
                  Still needed: {profile.missing.join(", ")}
                </p>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!ready}
              className="shrink-0 rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-40"
            >
              Submit for review
            </button>
          </div>
        </div>
      )}

      <form onSubmit={save} className="space-y-5">
        {/* account */}
        <Panel title="About you" sub="Shown on your public profile">
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <ImageUpload value={avatar} onChange={setAvatar}
                           max={1} label="Profile photo" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              <div>
                <label className="eyebrow text-white/45">Full name</label>
                <input required value={account.full_name}
                       onChange={(e) => setAccount({ ...account, full_name: e.target.value })}
                       className={field} />
              </div>
              <div>
                <label className="eyebrow text-white/45">Phone</label>
                <input value={account.phone}
                       onChange={(e) => setAccount({ ...account, phone: e.target.value })}
                       placeholder="077 123 4567" className={field} />
              </div>
              <div>
                <label className="eyebrow text-white/45">Country</label>
                <input value={account.country}
                       onChange={(e) => setAccount({ ...account, country: e.target.value })}
                       className={field} />
              </div>
              <div>
                <label className="eyebrow text-white/45">Years of experience</label>
                <input type="number" name="years_experience" min={0}
                       value={form.years_experience} onChange={change}
                       className={field} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow text-white/45">
                  Bio — what should travellers know about you?
                </label>
                <textarea name="bio" rows={4} value={form.bio} onChange={change}
                          placeholder={isGuide
                            ? "Licensed national guide with 8 years leading cultural and hill-country tours…"
                            : "Professional driver with 12 years of tourist transport experience…"}
                          className={field} />
              </div>
            </div>
          </div>
        </Panel>

        {/* languages */}
        <Panel title="Languages" sub="Travellers filter by this">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggle("languages", l)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  form.languages.includes(l)
                    ? "bg-saffron-500 font-medium text-night-900"
                    : "border border-white/15 text-white/65 hover:border-white/35 hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Panel>

        {/* guide-only */}
        {isGuide && (
          <>
            <Panel title="What you specialise in">
              <div className="flex flex-wrap gap-2">
                {SPECIALISATIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle("specializations", s)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      form.specializations.includes(s)
                        ? "bg-brand-600 font-medium text-white"
                        : "border border-white/15 text-white/65 hover:border-white/35 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Qualifications" sub="What makes you licensed to guide">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" name="sltda_registered"
                         checked={form.sltda_registered} onChange={change}
                         className="mt-1 accent-saffron-500" />
                  <span>
                    <span className="block font-display font-semibold text-white">
                      SLTDA registered tourist guide
                    </span>
                    <span className="mt-0.5 block text-sm text-white/55">
                      Registered with the Sri Lanka Tourism Development Authority.
                      This shows as a badge on your public profile.
                    </span>
                  </span>
                </label>

                {form.sltda_registered && (
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <label className="eyebrow text-white/45">SLTDA registration number</label>
                    <input name="sltda_number" value={form.sltda_number}
                           onChange={change} placeholder="SLTDA/TG/12345"
                           className={field} />
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="eyebrow text-white/45">Qualifications</label>
                  <textarea name="qualifications" rows={3} value={form.qualifications}
                            onChange={change}
                            placeholder="Diploma in Tourism, SLITHM"
                            className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Certifications</label>
                  <textarea name="certifications" rows={3} value={form.certifications}
                            onChange={change}
                            placeholder="First aid certified, Wildlife guiding certificate"
                            className={field} />
                </div>
              </div>
            </Panel>
          </>
        )}

        {/* driver-only */}
        {!isGuide && (
          <Panel title="Licence" sub="An admin checks this before you can drive">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="eyebrow text-white/45">Licence number</label>
                <input name="license_no" value={form.license_no}
                       onChange={change} placeholder="B1234567" className={field} />
              </div>
              <div>
                <label className="eyebrow text-white/45">Expiry date</label>
                <input type="date" name="license_expiry" value={form.license_expiry}
                       onChange={change} className={field} />
              </div>
            </div>
          </Panel>
        )}

        {/* rate + docs */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Your day rate" sub="What travellers pay per day">
            <label className="eyebrow text-white/45">Rate (LKR per day)</label>
            <input type="number" name="daily_rate" min={0} value={form.daily_rate}
                   onChange={change} placeholder="15000" className={field} />
            <p className="mt-2 text-xs text-white/45">
              Roamie takes 10%, so at LKR{" "}
              {Number(form.daily_rate || 0).toLocaleString()} a day you'd receive{" "}
              LKR {Math.round(Number(form.daily_rate || 0) * 0.9).toLocaleString()}.
            </p>
          </Panel>

          <Panel title="Verification documents"
                 sub="ID, licence, registration certificate — admin only, never public">
            <ImageUpload value={docs} onChange={setDocs} max={5} label="Documents" />
          </Panel>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={saving}
            className="rounded-full bg-saffron-500 px-6 py-3 text-sm font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
          <Link to={isGuide ? "/guide" : "/driver"}
                className="rounded-full border border-white/15 px-6 py-3 text-sm text-white hover:bg-white/10">
            Back to dashboard
          </Link>
        </div>
      </form>
    </DashShell>
  );
}