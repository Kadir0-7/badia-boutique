import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { api } from "../api.js";

function useUnread(user) {
  const [n, setN] = useState(0);
  const loc = useLocation();
  useEffect(() => {
    if (!user) return setN(0);
    let alive = true;
    const check = () => api("/conversations/unread").then(d => alive && setN(d.count)).catch(() => {});
    check();
    const t = setInterval(check, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [user, loc.pathname]);
  return n;
}

export default function Layout() {
  const { user } = useAuth();
  const unread = useUnread(user);
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const tabs = [["/", "For you"], ["/browse", "Browse"], ["/saved", "Saved"], ["/inbox", unread ? `Inbox (${unread})` : "Inbox"], ["/orders", "Orders"], ["/taste", "My taste"]];
  return (
    <>
      <header>
        <div className="bar">
          <Link to="/" className="logo">Badia<i>Boutique</i></Link>
          <Link to="/sell" className="btn p">Sell an item</Link>
          {user === undefined ? null : user
            ? <Link to="/account" className="btn">@{user.handle}</Link>
            : <Link to="/login" className="btn">Sign in</Link>}
        </div>
        <nav>
          {tabs.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>)}
        </nav>
      </header>
      <main><Outlet /></main>
      <footer>
        © {new Date().getFullYear()} Badia Boutique. All rights reserved. Owned by Abdikadir.
      </footer>
    </>
  );
}
