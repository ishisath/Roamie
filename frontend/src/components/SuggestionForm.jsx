import { useEffect, useState } from "react";
import { destinationsApi, suggestionsApi } from "../api/endpoints";
import ImageUpload from "./ImageUpload";

const empty = {
  kind: "NEW", name: "", region: "", lat: "", lng: "",
  description: "", why_popular: "", category_id: "",
  activities: "", target_destination_id: "",
};

export default function SuggestionForm({ onDone }) {
  const [form, setForm] = useState(empty);
  const [photos, setPhotos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [mine, setMine] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const loadMine = () =>
    suggestionsApi.mine().then((r) => setMine(r.data)).catch(() => {});

  useEffect(() => {
    destinationsApi.categories().then((r) => setCategories(r.data)).catch(() => {});
    destinationsApi.search({ size: 50 })
      .then((r) => setDestinations(r.data.items)).catch(() => {});
    loadMine();
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await suggestionsApi.create({
        kind: form.kind,
        target_destination_id: form.kind === "UPDATE" ? form.target_destination_id : null,
        name: form.name || null,
        region: form.region || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        description: form.description || null,
        why_popular: form.why_popular || null,
        category_id: form.category_id || null,
        activities: form.activities.split(",").map((a) => a.trim()).filter(Boolean),
        photos,
      });
      setForm(empty);
      setPhotos([]);
      setOk("Submitted. An admin will review it shortly.");
      loadMine();
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not submit.");
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-xl border border-sand-300 bg-white p-5">
        <h3 className="font-semibold">Suggest a destination</h3>
        <p className="mt-1 text-sm text-ink/60">
          Know somewhere worth adding, or spotted outdated information? Send it to us —
          an admin reviews everything before it goes live.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        {ok && (
          <div className="mt-4 rounded-lg bg-brand-50 px-4 py-2.5 text-sm text-brand-700">{ok}</div>
        )}

        <div className="mt-4 flex gap-2">
          {[["NEW", "New destination"], ["UPDATE", "Update an existing one"]].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setForm({ ...form, kind: v })}
              className={`rounded-full px-4 py-1.5 text-sm ${
                form.kind === v ? "bg-brand-600 text-white" : "border border-sand-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {form.kind === "UPDATE" && (
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Which destination?</label>
              <select name="target_destination_id" required
                      value={form.target_destination_id} onChange={change} className={field}>
                <option value="">Choose…</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {form.kind === "NEW" && (
            <>
              <div>
                <label className="text-sm font-medium">Name</label>
                <input name="name" required value={form.name} onChange={change}
                       placeholder="Diyaluma Falls" className={field} />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <select name="category_id" value={form.category_id}
                        onChange={change} className={field}>
                  <option value="">Choose…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium">Region</label>
            <input name="region" value={form.region} onChange={change}
                   placeholder="Uva Province" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">Latitude</label>
              <input name="lat" value={form.lat} onChange={change}
                     placeholder="6.7333" className={field} />
            </div>
            <div>
              <label className="text-sm font-medium">Longitude</label>
              <input name="lng" value={form.lng} onChange={change}
                     placeholder="81.0333" className={field} />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea name="description" rows={3} value={form.description}
                      onChange={change} className={field} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">
              {form.kind === "NEW" ? "Why is it becoming popular?" : "What needs updating?"}
            </label>
            <textarea name="why_popular" rows={2} value={form.why_popular}
                      onChange={change} className={field} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Activities (comma separated)</label>
            <input name="activities" value={form.activities} onChange={change}
                   placeholder="Hiking, Swimming" className={field} />
          </div>
          <div className="sm:col-span-2">
            <ImageUpload value={photos} onChange={setPhotos} max={4} label="Photos" />
          </div>
        </div>

        <button className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Submit for review
        </button>
      </form>

      {mine.length > 0 && (
        <div className="rounded-xl border border-sand-300 bg-white p-5">
          <h3 className="font-semibold">My submissions</h3>
          <ul className="mt-3 divide-y divide-sand-300">
            {mine.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{s.name || "Update suggestion"}</p>
                  <p className="text-xs text-ink/55">
                    {s.kind} · {new Date(s.created_at).toLocaleDateString("en-GB")}
                  </p>
                  {s.admin_note && (
                    <p className="mt-0.5 text-xs text-ink/60">Admin: {s.admin_note}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    s.status === "APPROVED" ? "bg-brand-50 text-brand-700"
                    : s.status === "REJECTED" ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}