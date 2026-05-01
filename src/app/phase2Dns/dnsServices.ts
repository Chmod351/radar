import { emptyWhois, SENSORS } from "../../shared/utils/const.ts";
import { logger } from "../../shared/systemLogger.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { dnsResolver } from "../../infra/adapters/dns.adapter.ts";
import { dnsMapper } from "../../infra/mappers/dnsx.mapper.ts";
import type { WhoisIntel, ASNIntel, ResolvedDomain, WebMetadata } from "../../domain/entities/types.ts";
import { getHttpHeaders } from "../../infra/adapters/http.adapter.ts";
import { httpParser } from "../../infra/mappers/http.mapper.ts";
import { isValididIp } from "../../domain/services/isValidIp.ts";
import { cymruService } from "../../infra/adapters/asnInfo.adapter.ts";
import { asnMapper } from "../../infra/mappers/asn.mapper.ts";
import { getRootDomain, normalizeWhois } from "../../infra/mappers/whois.mapper.ts";
import { getWhois } from "../../infra/adapters/whois.adapter.ts";

/**
 * CACHÉ GLOBAL DE WHOIS
 */
const whoisCache = new Map<string, WhoisIntel>();

const emptyResults={ asn:null,asn_owner:null,country:null };

export async function getASNInfo(ip: string): Promise<ASNIntel> {
  if (!isValididIp(ip)) {
    return emptyResults;
  }    
  const firstEntry= await cymruService(ip);
  if (!firstEntry) {
    return emptyResults;
  }
  return asnMapper(firstEntry);
}



export async function resolveSingleDomain(domain: string): Promise<ResolvedDomain | null> {
  try {
    // Ejecución directa para un solo target.
    const stdout = await dnsResolver(domain);
    return dnsMapper(stdout);
    
  } catch (e:unknown) {
    logger.error("RESOLVER-SINGLE-DOMAIN", getErrorMessage(e));
    // No logueamos error aquí para no ensuciar si el dominio simplemente no existe
    return null;
  }
}

/**
 * 2. ENRIQUECIMIENTO WEB 
 * Valida HTTP y obtiene metadata en un solo paso.
 */
export async function enrichWebData(host: string): Promise<WebMetadata> {
  const emptyRes= {
    url: `http://${host}`,
    status_code: SENSORS.INFRA_STATUS.ERROR,
    title: null,
    webserver: null,
    cdn: null,
  };
  try {
 
    const headers= await getHttpHeaders(host);
    const pardedHeaders= httpParser(headers, host);

    return pardedHeaders;
       
  } catch (e) {
    // Fallback: Si falla el escaneo profundo, devolvemos lo básico
    logger.error("ENRICH", `${host} fallo con error: ${e}, mandando fallback`);
    return emptyRes;
  }
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
  
    const stdout = await getWhois(root);

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
