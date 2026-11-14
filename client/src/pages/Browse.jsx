import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, qs } from "../api.js";
import { CAT_NAMES, LENGTHS, SECTIONS, SIZES, usesLength } from "../constants.js";
import { Grid, ErrorText, QuickFilters } from "../components/ui.jsx";

const PAGE = 48;

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const filters = { q: params.get("q") || "", section: params.get("section") || "", cat: params.get("cat") || "",
    cond: params.get("cond") || "", size: params.get("size") || "", sort: params.get("sort") || "" };
  const [text, setText] = useState(filters.q);
  const [items, setItems] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const key = qs(filters);

  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }); };

  // Debounce typing into the search box.
  useEffect(() => { const t = setTimeout(() => text !== filters.q && set("q", text.trim()), 300); return () => clearTimeout(t); }, [text]);

  useEffect(() => {
    const ctl = new AbortController();
    setItems(null); setError(null);
    api("/listings" + qs({ ...filters, limit: PAGE }), { signal: ctl.signal })
      .then(d => { setItems(d.items); setHasMore(d.hasMore); })
      .catch(e => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
  }, [key]);

  async function more() {
    try {
      const d = await api("/listings" + qs({ ...filters, limit: PAGE, offset: items.length }));
      setItems([...items, ...d.items]); setHasMore(d.hasMore);
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <h1>Browse everything</h1>
      <p className="sub">Live listings from every seller, newest first.</p>
      <QuickFilters params={params} setParams={setParams} />
      <div className="tools">
        <input type="search" placeholder="Search thobes, abayas, brands…" value={text} onChange={e => setText(e.target.value)} aria-label="Search" />
        <select value={filters.section} onChange={e => set("section", e.target.value)} aria-label="Men, women or kids">
          <option value="">Men, women &amp; kids</option>{SECTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.cond} onChange={e => set("cond", e.target.value)} aria-label="New or used">
          <option value="">New &amp; used</option><option value="new">New</option><option value="used">Used</option>
        </select>
        <select value={filters.cat} onChange={e => set("cat", e.target.value)} aria-label="Category">
          <option value="">All categories</option>{CAT_NAMES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.size} onChange={e => set("size", e.target.value)} aria-label="Size">
          <option value="">Any size</option>
          {usesLength(filters.cat)
            ? LENGTHS.map(s => <option key={s} value={s}>{s === "One size" ? s : "Length " + s + "″"}</option>)
            : <>
                {!filters.cat && <optgroup label="Thobes & abayas">{LENGTHS.filter(s => s !== "One size").map(s => <option key={s} value={s}>Length {s}″</option>)}</optgroup>}
                <optgroup label={filters.cat ? "Sizes" : "Other clothing"}>{SIZES.map(s => <option key={s}>{s}</option>)}</optgroup>
                {filters.size && !SIZES.includes(filters.size) && !LENGTHS.includes(filters.size) && <option value={filters.size}>{filters.size}</option>}
              </>}
        </select>
        <select value={filters.sort} onChange={e => set("sort", e.target.value)} aria-label="Sort">
          <option value="">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>
        </select>
      </div>
      <ErrorText error={error} />
      <Grid items={items} empty="Nothing matches that search. Clear the filters to see more." />
      {hasMore && <p style={{ textAlign: "center", marginTop: 24 }}><button className="btn" onClick={more}>Load more</button></p>}
    </>
  );
}
