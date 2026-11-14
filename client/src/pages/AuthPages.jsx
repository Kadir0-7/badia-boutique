import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { ErrorText } from "../components/ui.jsx";
import { DISCLAIMER } from "../constants.js";

// Only follow ?next= links that stay on this site. Browsers treat "/\evil.com"
// like "//evil.com" (another website), so backslashes, control characters and
// anything that doesn't resolve to our own origin are rejected.
export function safeNext(n) {
  if (typeof n !== "string" || !n.startsWith("/") || n.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(n)) return "/";
  try {
    const u = new URL(n, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : "/";
  } catch { return "/"; }
}

function useAuthForm() {
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const nav = useNavigate();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = fn => async e => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await fn(); nav(next, { replace: true }); } catch (err) { setError(err.message); setBusy(false); }
  };
  return { next, error, busy, run };
}

export function Login() {
  const { user, login } = useAuth();
  const { next, error, busy, run } = useAuthForm();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (user) return <Navigate to={next} replace />;
  return (
    <>
      <h1>Welcome back</h1>
      <p className="sub">New here? <Link to={"/signup?next=" + encodeURIComponent(next)}>Create an account</Link></p>
      <form className="f narrow" onSubmit={run(() => login(email, password))}>
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <ErrorText error={error} />
        <div><button className="btn p" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></div>
      </form>
    </>
  );
}

export function Signup() {
  const { user, signup } = useAuth();
  const { next, error, busy, run } = useAuthForm();
  const [f, setF] = useState({ email: "", handle: "", password: "", gender: "", acceptedTerms: false });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  if (user) return <Navigate to={next} replace />;
  return (
    <>
      <h1>Create your account</h1>
      <p className="sub">Already have one? <Link to={"/login?next=" + encodeURIComponent(next)}>Sign in</Link></p>
      <form className="f narrow" onSubmit={run(() => signup(f))}>
        <label>Email<input type="email" autoComplete="email" required value={f.email} onChange={set("email")} /></label>
        <label>Username<input autoComplete="username" required minLength="3" maxLength="24" pattern="[A-Za-z0-9._]+" value={f.handle} onChange={set("handle")} placeholder="yourname" />
          <span className="note">Letters, numbers, dots and underscores. Shown on your listings.</span></label>
        <label>Password<input type="password" autoComplete="new-password" required minLength="8" value={f.password} onChange={set("password")} />
          <span className="note">At least 8 characters.</span></label>
        <fieldset className="choice">
          <legend>Are you male or female?</legend>
          {["female", "male"].map(g => (
            <label key={g} className="radio">
              <input type="radio" name="gender" value={g} required checked={f.gender === g} onChange={set("gender")} />
              {g === "female" ? "Female" : "Male"}
            </label>
          ))}
        </fieldset>
        <div className="disclaimer">
          <b>Please note</b>
          <p>{DISCLAIMER}</p>
          <label className="check">
            <input type="checkbox" required checked={f.acceptedTerms} onChange={e => setF({ ...f, acceptedTerms: e.target.checked })} />
            I understand and will keep this in mind.
          </label>
        </div>
        <ErrorText error={error} />
        <div><button className="btn p" disabled={busy || !f.acceptedTerms}>{busy ? "Creating…" : "Create account"}</button></div>
      </form>
    </>
  );
}
