import { SENSORS } from "../../shared/utils/const.ts";
import { logger } from "../../shared/systemLogger.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { dnsResolver } from "../../infra/adapters/dns.adapter.ts";
import { dnsMapper } from "../../infra/mappers/dnsx.mapper.ts";
import type { ResolvedDomain, WebMetadata } from "../../domain/entities/types.ts";
import { execa } from "execa";
import { identifyCDN } from "../../domain/services/cdnDetector.ts";
import { getHttpHeaders } from "../../infra/adapters/http.adapter.ts";
import { httpParser } from "../../infra/mappers/http.mapper.ts";


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
    }
  try {
 
    const headers= await getHttpHeaders(host)
    const pardedHeaders= httpParser(headers, host)

    return pardedHeaders;
       
  } catch (e) {
    // Fallback: Si falla el escaneo profundo, devolvemos lo básico
    logger.error("ENRICH", `${host} fallo con error: ${e}, mandando fallback`);
    return emptyRes
  }
}


