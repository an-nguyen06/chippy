// Only allow local destinations, and avoid redirecting back to auth pages.
export function getAuthDestination(from: unknown): string {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return "/";
  const pathname = from.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  if (pathname === "/signin" || pathname === "/signup") return "/";
  return from;
}
