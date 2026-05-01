export function getRootDomain(host: string): string {
  const parts = host.split(".");
  if (parts.length <= 2) return host;

  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  if (last && prev) {
    if (last.length <= 2 && prev.length <= 3) {
      return parts.slice(-3).join(".");
    }
  
    return parts.slice(-2).join(".");
  }
  return parts.slice(-2).join(".");
}


