export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function finite(value, fallback = 0) {
  if (value === null || value === "" || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function imagePath(value) {
  const path = typeof value === "string" ? value.trim().slice(0, 8192) : "";
  if (!path || /[\x00-\x1f]/.test(path) || path.startsWith("//") || path.includes("\\")) return "";
  if (/^[a-z][a-z\d+.-]*:/i.test(path) && !/^https?:\/\//i.test(path)) return "";
  return path;
}
