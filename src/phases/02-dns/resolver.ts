import { execa } from "execa";
import { logger } from "../../shared/errorLogger.ts";
import { getErrorMessage, SENSORS } from "../../shared/utils.ts";
import type { AnalyzedTarget, DnsPhase, ResolvedDomain, WebMetadata } from "../../shared/types.ts";
import { identifyCDN } from "./ansLookup.ts";

export function refineInfraExposure(target: AnalyzedTarget): AnalyzedTarget {
  const serverHeader = (target.webserver || "").toLowerCase();
  const openPorts = target.open_ports || [];
  
  // 1. SEÑALES DE ORIGIN (Certeza absoluta)
  // Si Nmap encontró servicios de administración o DB expuestos
  const hasInfraPorts = openPorts.some(p => 
    [21, 22, 25, 110, 143,3000, 3306, 5432,5060, 8080, 8443].includes(p.port),
  );

  // Si el server reporta ser un software crudo sin intermediarios
  const isRawServer = ["apache", "nginx", "lighttpd", "litespeed"].some(s => 
    serverHeader.includes(s),
  );

  // 2. LÓGICA DE ACTUALIZACIÓN
  let finalInfra = target.infra_type;

  // Si antes era UNKNOWN 
  if (hasInfraPorts || isRawServer) {
    finalInfra = SENSORS.INFRA_TYPE.SELF_HOSTED; 
  } 
  
  // Caso especial: Si Nmap no devolvió NADA y no hay headers de server, 
  // pero el ASN decía Cloud, lo mantenemos como CLOUD.
  
  let priority = target.priority;
  if (openPorts.some(p => [3306, 21, 22,5060,2000].includes(p.port))) {
    priority = SENSORS.PRIORITY.CRITICAL; 
  }

  return {
    ...target,
    infra_type: finalInfra,
    priority,
  };
}




/**
 * 1. RESOLVER DOMINIO 
 * Recibe UN dominio, devuelve host e ip.
 */

const globalFingerprints= new Set<string>();

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

/**
 * 3. CLASIFICADOR DE TARGET 
 *  para decidir qué hacer con el target.
 */

export function classifyTarget(domainData: DnsPhase): Partial<AnalyzedTarget> {
  const cloudNoise = ["cloudflare", "akamai", "vercel", "fastly", "google-cloud","amazon"];
  const asnOwner = (domainData.asn_owner || "").toLowerCase();
  const isNoise = cloudNoise.some(key => asnOwner.includes(key));

  const fingerprint = `${domainData.ip}_${domainData.status_code}_${domainData.title}`;


  let action:number = SENSORS.ACTION.SKIP;
  let priority:number = SENSORS.PRIORITY.LOW; 

  if (globalFingerprints.has(fingerprint)) {
    return { ...domainData, 
      infra_type:isNoise?SENSORS.INFRA_TYPE.CLOUD:SENSORS.INFRA_TYPE.UNKNOWN 
      , action: SENSORS.ACTION.DUPLICATE ,
      priority,
    };
  }

  globalFingerprints.add(fingerprint);
 
  if (isNoise) {
    return { ...domainData, 
      infra_type:SENSORS.INFRA_TYPE.CLOUD ,
      priority,
      action, 
    };
  }
  priority=SENSORS.PRIORITY.HIGH; 
  action=SENSORS.ACTION.READY;

  return {
    ...domainData,
    priority,
    infra_type: SENSORS.INFRA_TYPE.UNKNOWN,
    action,
  };
}
