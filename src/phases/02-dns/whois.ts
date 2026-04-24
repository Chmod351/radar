import { execa } from "execa";
import type { WhoisIntel } from "../../shared/types.ts";
import { logger } from "../../shared/systemLogger.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { normalizeWhois } from "../../parsers/normalizeWhois.ts";

/**
 * CACHÉ GLOBAL DE WHOIS
 */
const whoisCache = new Map<string, WhoisIntel>();

export const emptyWhois: WhoisIntel = {
  registrar: null,
  creationDate: null,
  expirationDate: null,
  nameServers: [],
  status: [],
  emails: null,
  raw: "",
}; 

/**
 * 1. OBTENER DOMINIO RAÍZ
 * 
 */
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

export async function getWhoisIntel(host: string): Promise<WhoisIntel> {
  const root = getRootDomain(host);
  
  // Check de caché instantáneo

  if (whoisCache.has(root)) {
    return whoisCache.get(root)!;
  }
  try {
    // Intentamos ejecutar whois con un timeout agresivo
    // Si el puerto 43 está cerrado, esto fallará rápido
    const { stdout } = await execa("whois", [root], { 
      timeout: 8000,
      reject: true, 
    });

    if (!stdout || stdout.includes("No match for")) return emptyWhois;

    const parsed = normalizeWhois(stdout);
    whoisCache.set(root, parsed);
    return parsed;
  } catch (error: unknown) {
    whoisCache.set(root, emptyWhois);
    logger.error("WHO-IS", getErrorMessage(error));
    return emptyWhois;
  }
}
