const LS_USERS = "fc_users";
const LS_CUR = "fc_current_user";

export function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS) || "[]");
  } catch {
    return [];
  }
}
export function saveUsers(u) {
  localStorage.setItem(LS_USERS, JSON.stringify(u));
}
export function getCurrent() {
  try {
    return JSON.parse(localStorage.getItem(LS_CUR) || "null");
  } catch {
    return null;
  }
}
export function setCurrent(u) {
  u
    ? localStorage.setItem(LS_CUR, JSON.stringify(u))
    : localStorage.removeItem(LS_CUR);
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
