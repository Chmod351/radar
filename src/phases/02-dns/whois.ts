import { execa } from "execa";
import { logger } from "../../shared/systemLogger.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import type { WhoisIntel } from "../../domain/entities/types.ts";
import { normalizeWhois } from "../../infra/mappers/normalizeWhois.ts";
import { getRootDomain } from "../../infra/mappers/whois.mapper.ts";
import { getWhois } from "../../infra/adapters/whois.adapter.ts";

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

export async function getWhoisIntel(host: string): Promise<WhoisIntel> {
  const root = getRootDomain(host); 

  // Check de caché instantáneo
  if (whoisCache.has(root)) {
    return whoisCache.get(root)!;
  }
  try {
    // Intentamos ejecutar whois con un timeout agresivo
    // Si el puerto 43 está cerrado, esto fallará rápido
  
    const stdout = await getWhois(root)

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
