import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = signed out

  useEffect(() => { api("/auth/me").then(d => setUser(d.user)).catch(() => setUser(null)); }, []);

  const login = useCallback(async (email, password) => {
    const d = await api("/auth/login", { method: "POST", body: { email, password } });
    setUser(d.user);
  }, []);
  const signup = useCallback(async fields => {
    const d = await api("/auth/signup", { method: "POST", body: fields });
    setUser(d.user);
  }, []);
  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, setUser, login, signup, logout }}>{children}</Ctx.Provider>;
}

// Wrap a page that needs an account. Sends people to sign in, then back here.
export function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <p className="empty">Loading…</p>;
  if (!user) return <Navigate to={"/login?next=" + encodeURIComponent(loc.pathname + loc.search)} replace />;
  return children;
}
