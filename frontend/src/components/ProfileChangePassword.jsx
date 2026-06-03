import { useState } from "react";
import { apiFetch } from "../constants";
import {
  getNetworkOrErrorMessage,
  parseApiResponse,
} from "../utils/apiErrors";

/** SCRUM-93: change password UI — POST /auth/change-password (logged-in user). */
export default function ProfileChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    if (next !== confirm) {
      setErr("New passwords do not match.");
      return;
    }
    if (next.length < 6) {
      setErr("New password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: current,
          new_password: next,
        }),
      });
      await parseApiResponse(res);
      setOk("Password updated successfully.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setErr(getNetworkOrErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="profile-pw" onSubmit={submit}>
      <h3 className="profile-pw-title">Change password</h3>
      {err && <div className="auth-err">{err}</div>}
      {ok && <div className="msg-ok">{ok}</div>}
      <div className="profile-pw-fields">
        <label className="profile-pw-label">
          Current password
          <div className="field-wrap">
            <span className="field-icon">🔒</span>
            <input
              type="password"
              value={current}
              onChange={(e) => {
                setCurrent(e.target.value);
                setErr("");
                setOk("");
              }}
              autoComplete="current-password"
              required
            />
          </div>
        </label>
        <label className="profile-pw-label">
          New password
          <div className="field-wrap">
            <span className="field-icon">🔒</span>
            <input
              type="password"
              value={next}
              onChange={(e) => {
                setNext(e.target.value);
                setErr("");
                setOk("");
              }}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
        </label>
        <label className="profile-pw-label">
          Confirm new password
          <div className="field-wrap">
            <span className="field-icon">🔒</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setErr("");
                setOk("");
              }}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
        </label>
      </div>
      <button type="submit" className="btn btn-teal" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
