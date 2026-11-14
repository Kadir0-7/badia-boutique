import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../toast.jsx";
import { CAT_NAMES, CONDS, DISCLAIMER, LENGTHS, SECTIONS, SIZES, usesLength } from "../constants.js";
import { ErrorText } from "../components/ui.jsx";

const MAX = 6;
const BLANK = { title: "", price: "", section: "", cat: "Thobes", brand: "", size: "", cond: "Good", description: "" };
const OTHER = "__other";

// Thobes/abayas: pick a length. Everything else: XS–XL / One size, or type your own (30/30, UK 10…).
function SizeField({ cat, value, onChange }) {
  const length = usesLength(cat);
  const [typing, setTyping] = useState(!length && !!value && !SIZES.includes(value));
  if (length) {
    return (
      <label>Length
        <select required value={LENGTHS.includes(value) ? value : ""} onChange={e => onChange(e.target.value)}>
          <option value="" disabled>Choose length</option>
          {LENGTHS.map(s => <option key={s} value={s}>{s === "One size" ? s : s + "″"}</option>)}
        </select>
        <span className="note">In inches, shoulder to hem</span>
      </label>
    );
  }
  return (
    <label>Size
      <select required value={typing ? OTHER : SIZES.includes(value) ? value : ""}
        onChange={e => { const v = e.target.value; setTyping(v === OTHER); onChange(v === OTHER ? "" : v); }}>
        <option value="" disabled>Choose size</option>
        {SIZES.map(s => <option key={s}>{s}</option>)}
        <option value={OTHER}>Other (type your own)</option>
      </select>
      {typing && (
        <input required autoFocus maxLength="12" pattern="[A-Za-z0-9][A-Za-z0-9 .\/\-\(\)]*" value={value}
          onChange={e => onChange(e.target.value)} placeholder="e.g. 30/30, UK 10, EU 42" aria-label="Your size" />
      )}
    </label>
  );
}

// Used for both "Sell an item" (/sell) and "Edit listing" (/listing/:id/edit).
export default function ListingForm() {
  const { id } = useParams();
  const editing = !!id;
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState(BLANK);
  const [kept, setKept] = useState([]);      // existing photo URLs (edit mode)
  const [files, setFiles] = useState([]);    // new File objects
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    api("/listings/" + id).then(l => {
      if (l.sellerId !== user.id) return nav("/listing/" + id, { replace: true });
      setF({ title: l.title, price: String(l.price), section: l.section || "", cat: l.cat, brand: l.brand, size: l.size, cond: l.cond, description: l.description });
      setKept(l.photos); setLoaded(true);
    }).catch(e => setError(e.message));
  }, [id]);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  const set = k => e => setF({ ...f, [k]: e.target.value });
  const total = kept.length + files.length;

  function addFiles(e) {
    const picked = [...e.target.files].filter(x => /^image\/(jpeg|png|webp|gif)$/.test(x.type));
    const tooBig = picked.filter(x => x.size > 5 * 1024 * 1024);
    if (tooBig.length) toast("Each photo must be under 5 MB");
    setFiles([...files, ...picked.filter(x => x.size <= 5 * 1024 * 1024)].slice(0, MAX - kept.length));
    e.target.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!total) return setError("Add at least one photo so buyers can see the item.");
    setBusy(true); setError(null);
    const body = new FormData();
    Object.entries(f).forEach(([k, v]) => body.append(k, v));
    if (editing) body.append("keepPhotos", JSON.stringify(kept));
    files.forEach(file => body.append("photos", file));
    try {
      const l = await api(editing ? "/listings/" + id : "/listings", { method: editing ? "PATCH" : "POST", body });
      toast(editing ? "Listing updated" : "Your listing is live");
      nav("/listing/" + l.id);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  if (!loaded) return error ? <ErrorText error={error} /> : <p className="empty">Loading…</p>;

  return (
    <>
      <h1>{editing ? "Edit listing" : "Sell an item"}</h1>
      <p className="sub">{editing ? "Changes show up straight away." : "Your listing goes live on the feed, and shoppers whose taste matches see it first."}</p>
      <form className="f" onSubmit={submit}>
        <div className="disclaimer"><b>Please note</b><p>{DISCLAIMER}</p></div>
        <fieldset className="choice">
          <legend>Who is it for?</legend>
          {SECTIONS.map(s => (
            <label key={s} className="radio">
              <input type="radio" name="section" value={s} required checked={f.section === s} onChange={set("section")} />{s}
            </label>
          ))}
        </fieldset>
        <div>
          <b>Photos ({total}/{MAX})</b>
          <div className="photo-picker">
            {kept.map(p => (
              <div className="pp" key={p}><img src={p} alt="" />
                <button type="button" onClick={() => setKept(kept.filter(x => x !== p))} aria-label="Remove photo">✕</button></div>
            ))}
            {previews.map((p, i) => (
              <div className="pp" key={p}><img src={p} alt="" />
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove photo">✕</button></div>
            ))}
            {total < MAX && (
              <label className="pp add">＋<span>Add photos</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={addFiles} hidden />
              </label>
            )}
          </div>
          <p className="note">The first photo is the cover. JPEG, PNG, WebP or GIF, up to 5 MB each.</p>
        </div>
        <label>Title<input required maxLength="70" value={f.title} onChange={set("title")} placeholder="Black open abaya, size 54" /></label>
        <div className="row">
          <label>Price ($)<input type="number" min="1" max="10000" step="0.01" required value={f.price} onChange={set("price")} /></label>
          <label>Category<select value={f.cat} onChange={e => {
            const cat = e.target.value;
            // Switching between length-sized and S/M/L categories clears the size.
            setF({ ...f, cat, size: usesLength(cat) === usesLength(f.cat) ? f.size : "" });
          }}>{CAT_NAMES.map(c => <option key={c}>{c}</option>)}</select></label>
        </div>
        <div className="row">
          <label>Brand<input maxLength="30" value={f.brand} onChange={set("brand")} /></label>
          <SizeField key={usesLength(f.cat) ? "length" : "size"} cat={f.cat} value={f.size} onChange={size => setF(cur => ({ ...cur, size }))} />
        </div>
        <label>Condition<select value={f.cond} onChange={set("cond")}>{CONDS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Description<textarea rows="4" maxLength="1000" value={f.description} onChange={set("description")} placeholder="Fit, flaws, measurements" /></label>
        <ErrorText error={error} />
        <div className="actions">
          <button className="btn p" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Post listing"}</button>
          {editing && <Link className="btn" to={"/listing/" + id}>Cancel</Link>}
        </div>
      </form>
    </>
  );
}
