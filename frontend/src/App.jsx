import { useEffect, useState } from "react";
import { injectCSS } from "./utils/injectCSS";
import { getToken, clearToken } from "./utils/storage";
import { API_BASE } from "./constants";
import { LoginPage, RegisterPage } from "./components/AuthPages";
import MainApp from "./components/MainApp";

injectCSS();

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("loading");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setPage("login");
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u) {
          setUser(u);
          setPage("app");
        } else {
          clearToken();
          setPage("login");
        }
      })
      .catch(() => {
        clearToken();
        setPage("login");
      });
  }, []);

  function login(u) {
    setUser(u);
    setPage("app");
  }

  function logout() {
    // Immediately clear local state and unmount MainApp so no in-flight
    // requests fire with the old token while the logout call is in progress.
    const token = getToken();
    clearToken();
    setUser(null);
    setPage("login");

    // Best-effort server-side session cleanup.
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  if (page === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "1.1rem",
          color: "var(--teal-d)",
          fontWeight: 700,
        }}
      >
        Loading...
      </div>
    );
  }

  if (page === "login")
    return <LoginPage onLogin={login} goReg={() => setPage("register")} />;
  if (page === "register")
    return <RegisterPage onLogin={login} goLogin={() => setPage("login")} />;
  return <MainApp user={user} onLogout={logout} />;
}
