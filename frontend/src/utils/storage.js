// Only the study session history stays in localStorage now.
// User auth is token-based (token in localStorage, data in DB).

export function getToken() {
  return localStorage.getItem("fc_token");
}
export function setToken(t) {
  localStorage.setItem("fc_token", t);
}
export function clearToken() {
  localStorage.removeItem("fc_token");
}

export function getHistory(userId) {
  try {
    return JSON.parse(localStorage.getItem(`fc_history_${userId}`) || "[]");
  } catch {
    return [];
  }
}
export function saveHistory(userId, sessions) {
  localStorage.setItem(`fc_history_${userId}`, JSON.stringify(sessions));
}
export function addSession(userId, { correct, wrong, total, pct }) {
  const sessions = getHistory(userId);
  sessions.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    correct,
    wrong,
    total,
    pct,
  });
  saveHistory(userId, sessions.slice(0, 50));
}
