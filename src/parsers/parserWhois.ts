/**
 * RARSER AGNÓSTICO 
 * 
* */


type WhoisRawData = Record<string, string | string[]>;

export function parseWhoisAgnostic(rawText: string): WhoisRawData {
  const lines = rawText.split("\n");
  const json: WhoisRawData = {};

  for (const line of lines) {
    // Limpieza de comentarios y líneas sin ":"
    if (line.startsWith("%") || line.startsWith("#") || !line.includes(":")) continue;

    const [rawKey, ...valueParts] = line.split(":");
    if (!rawKey) continue;

    const key = rawKey.trim().toLowerCase().replace(/\s+/g, "_");
    const value = valueParts.join(":").trim();
    if (!value) continue;

    const existing = json[key];
    if (existing) {
      // Si ya existe, convertimos a array o agregamos al existente
      json[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      json[key] = value;
    }
  }
  return json;
}
