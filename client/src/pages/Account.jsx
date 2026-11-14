import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../toast.jsx";
import { useLoad } from "../useLoad.js";
import { Grid, ErrorText } from "../components/ui.jsx";

export default function Account() {
  const { user, setUser, logout } = useAuth();
  const { data } = useLoad("/me/listings");
  const [bio, setBio] = useState(user.bio);
  const [error, setError] = useState(null);
  const toast = useToast();
  const nav = useNavigate();

  async function saveBio(e) {
    e.preventDefault();
    try { const d = await api("/auth/me", { method: "PATCH", body: { bio } }); setUser(d.user); toast("Profile saved"); }
    catch (err) { setError(err.message); }
  }

  const items = data?.items;
  return (
    <>
      <h1>@{user.handle}</h1>
      <p className="sub">{user.email} · <Link to={"/u/" + user.handle}>View public profile</Link> · <button className="link" onClick={async () => { await logout(); nav("/"); }}>Sign out</button></p>

      <form className="f" onSubmit={saveBio}>
        <label>Bio<textarea rows="2" maxLength="300" value={bio} onChange={e => setBio(e.target.value)} placeholder="What you sell, how fast you ship" /></label>
        <ErrorText error={error} />
        <div><button className="btn">Save bio</button></div>
      </form>

      <h2>Your listings</h2>
      <p className="sub"><Link className="btn p sm" to="/sell">List another item</Link></p>
      <Grid items={items?.filter(l => l.status !== "sold")} empty="You haven’t listed anything yet." />
      {items?.some(l => l.status === "sold") && <><h2>Sold</h2><Grid items={items.filter(l => l.status === "sold")} /></>}
    </>
  );
}
