export function normalizeScanTarget(input: string): string {
  if (!input) return "";

  let clean = input.trim().toLowerCase();
  // Eliminar protocolos
  clean = clean.replace(/^(?:f|ht)tps?:\/\//, "");

 
  // Extraemos el primer elemento y, si no existe, le asignamos ""
  const [beforeSlash] = clean.split("/");
  const [beforeQuery] = (beforeSlash || "").split("?");
  const [domain] = (beforeQuery || "").split(":");

  // Usamos el operador || "" una última vez por si acaso
  clean = (domain || "").replace(/^www\./, "");
  clean = clean.replace(/^www\./, "");

  return clean;
}
