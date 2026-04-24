import { execa } from "execa";
import type { ResolvedDomain, WebMetadata } from "../../shared/types.ts";
import { identifyCDN } from "./ansLookup.ts";
import { SENSORS } from "../../shared/utils/const.ts";
import { logger } from "../../shared/systemLogger.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";


/**
 * 1. RESOLVER DOMINIO 
 * Recibe UN dominio, devuelve host e ip.
 */

export async function resolveSingleDomain(domain: string): Promise<ResolvedDomain | null> {
  try {
    // Ejecución directa para un solo target.
    const { stdout } =await execa("dnsx", [
      "-json",
      "-silent",
      "-nc",
      "-a",
      "-resp"],
    { input:domain,
      timeout: 10000 });

    if (!stdout.trim()) return null;

    const data = JSON.parse(stdout);
    return {
      host: data.host,
      ip: data.a?.[0] || "0.0.0.0",
    };
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
  try {
    const { stdout } = await execa("httpx-toolkit", [
      "-silent",
      "-no-color",
      "-title",
      "-web-server",
      "-status-code",
      // "-threads",
      "-json",
      // "50",
    ], { input:host, 
      timeout: 20000 });

    if (!stdout.trim()) throw new Error("No web response");

    const data = JSON.parse(stdout);
   
    const serverHeader = (data.web_server || data.server || "").toLowerCase();
    const headersRaw = JSON.stringify(data.headers || {}).toLowerCase();
   
    const { cdn }=identifyCDN(undefined,serverHeader,headersRaw);
      
    return {
      url: data.url || `http://${host}`,
      // Manejo de discrepancias entre versiones de httpx-toolkit
      status_code: data.status_code || data["status-code"] || 0,
      title: data.title || null,
      webserver: data.web_server || data.server || data.webserver || null,
      cdn: cdn,
    };  } catch (e) {
    // Fallback: Si falla el escaneo profundo, devolvemos lo básico
    logger.error("ENRICH", `${host} fallo con error: ${e}, mandando fallback`);
    return {
      url: `http://${host}`,
      status_code: SENSORS.INFRA_STATUS.ERROR,
      title: null,
      webserver: null,
      cdn: null,
    };
  }
}


