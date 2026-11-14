// Small fetch wrapper. Sends the session cookie, encodes JSON (or FormData for
// photo uploads) and turns { error } responses into thrown Errors.
export async function api(path, { method = "GET", body, signal } = {}) {
  const opts = { method, credentials: "same-origin", signal, headers: {} };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers["Content-Type"] = "application/json"; }

  let res;
  try { res = await fetch("/api" + path, opts); }
  catch (e) { if (e.name === "AbortError") throw e; throw new Error("Can’t reach the server. Check your connection."); }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export const qs = params => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== "" && v != null) p.set(k, v); });
  const s = p.toString();
  return s ? "?" + s : "";
};
