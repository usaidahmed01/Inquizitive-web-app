export function normalizeFullName(s = "") {
  return String(s)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}
