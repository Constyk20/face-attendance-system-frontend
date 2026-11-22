/** Message to show the user for a failed request. Returns "" for cancelled ones. */
export function errorMessage(err, fallback = "Something went wrong") {
  if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return "";
  const message = err?.response?.data?.message;
  if (message) return message;
  if (!err?.response) {
    return "Cannot reach the server. Check that the backend is running.";
  }
  return fallback;
}

export function isCanceled(err) {
  return err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
}

export function formatLongDate(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return (
    date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

/** "2026-11-22" -> short weekday ("Sun"), parsed as a local date (no timezone shift). */
export function weekdayLabel(isoDate) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "short" });
}

export function firstName(fullName) {
  return String(fullName || "").trim().split(/\s+/)[0] || "";
}

export function initials(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}
