import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import { useLoad } from "../useLoad.js";
import { CAT_NAMES, CONDS, LENGTHS, SECTIONS, SIZES } from "../constants.js";
import { Chips, ErrorText } from "../components/ui.jsx";

export default function Taste() {
  const { data } = useLoad("/me/profile");
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);
  const nav = useNavigate();
  const toast = useToast();
  useEffect(() => { if (data) setP(data); }, [data]);
  if (!p) return <p className="empty">Loading…</p>;

  const set = k => v => setP({ ...p, [k]: v });
  async function save(e) {
    e.preventDefault();
    try { await api("/me/profile", { method: "PUT", body: p }); toast("Preferences saved"); nav("/"); }
    catch (err) { setError(err.message); }
  }

  return (
    <>
      <h1>Your taste</h1>
      <p className="sub">These preferences drive your feed. Only you can see them.</p>
      <form className="f" onSubmit={save}>
        <div><b>Shopping for</b><Chips options={SECTIONS} value={p.sections} onChange={set("sections")} />
          {!p.sections.length && <p className="note">If you leave this empty, we use what you chose when you signed up.</p>}</div>
        <div><b>Categories you shop</b><Chips options={CAT_NAMES} value={p.cats} onChange={set("cats")} /></div>
        <div><b>Your sizes</b><Chips options={SIZES} value={p.sizes} onChange={set("sizes")} /></div>
        <div><b>Your thobe / abaya length</b> <span className="note">(inches)</span>
          <Chips options={LENGTHS.filter(s => s !== "One size")} value={p.sizes} onChange={set("sizes")} /></div>
        <label>Favorite brands (comma separated)
          <input value={p.brands} maxLength="200" onChange={e => set("brands")(e.target.value)} placeholder="Levi’s, Nike, Patagonia" /></label>
        <div><b>Condition you’ll accept</b><Chips options={CONDS} value={p.conds} onChange={set("conds")} /></div>
        <label>Max price per item: ${p.max}
          <input type="range" min="10" max="500" step="5" value={p.max} onChange={e => set("max")(+e.target.value)} /></label>
        <ErrorText error={error} />
        <div><button className="btn p">Save and see my feed</button></div>
      </form>
    </>
  );
}
