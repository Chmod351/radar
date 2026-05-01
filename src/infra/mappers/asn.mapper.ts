export function asnMapper(entry:string) {
  const parts = entry.split("|").map(p => p.trim());
  return {
    asn: parts[0] ? `AS${parts[0]}` : null,
    asn_owner: parts[1] || null,
    country: parts[2] || null,
  };
}
