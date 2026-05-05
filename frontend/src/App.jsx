import { useState } from "react";
import { injectCSS } from "./utils/injectCSS";
import { getCurrent, setCurrent } from "./utils/storage";
import { LoginPage, RegisterPage } from "./components/AuthPages";
import MainApp from "./components/MainApp";

injectCSS();

export default function App() {
  const [user, setUser] = useState(getCurrent);
  const [page, setPage] = useState(() => (getCurrent() ? "app" : "login"));

  function login(u) {
    setCurrent(u);
    setUser(u);
    setPage("app");
  }
  function logout() {
    setCurrent(null);
    setUser(null);
    setPage("login");
  }

  if (page === "login")
    return <LoginPage onLogin={login} goReg={() => setPage("register")} />;
  if (page === "register")
    return <RegisterPage onLogin={login} goLogin={() => setPage("login")} />;
  return <MainApp user={user} onLogout={logout} />;
}
