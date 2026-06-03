/** SCRUM-83: shared API / network error messages for all tabs. */

export function formatApiDetail(detail) {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        const loc = item.loc ? item.loc.join(".") : "";
        const msg = item.msg || item.message || JSON.stringify(item);
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join("; ");
  }
  if (typeof detail === "object" && detail.message) return String(detail.message);
  return String(detail);
}

export function getApiErrorMessage(res, data) {
  const detail = data?.detail ?? data?.message;
  const formatted = formatApiDetail(detail);
  if (formatted) return formatted;
  if (res?.status === 401) return "Session expired. Please sign in again.";
  if (res?.status === 403) return "You do not have permission for this action.";
  if (res?.status === 404) return "The requested resource was not found.";
  if (res?.status >= 500) return "Server error. Please try again later.";
  return `Request failed (${res?.status ?? "unknown"}).`;
}

export function getNetworkOrErrorMessage(err) {
  if (!err) return "Something went wrong.";
  const msg = err.message || String(err);
  if (
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed")
  ) {
    return "Cannot reach the server. Check that the backend is running and try again.";
  }
  return msg;
}

export async function parseApiResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new Error(getApiErrorMessage(res, data));
  return data;
}
