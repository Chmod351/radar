import { execa } from "execa";
import { logger } from "../../shared/errorLogger.ts";
import type { OpenPort } from "../../shared/types.ts";
import { getErrorMessage, PROTOCOLS } from "../../shared/utils.ts";



const MAX_NMAP_CONCURRENCY = 1;
const active: Promise<unknown>[] = []; 

// EVITA QUE SE QUEME EL PC
async function runWithNmapLimit<T>(fn: () => Promise<T>): Promise<T> {
  while (active.length >= MAX_NMAP_CONCURRENCY) {
    await Promise.race(active);
  }

  const job = fn();
  active.push(job);

  try {
    return await job;
  } finally {
    const i = active.indexOf(job);
    if (i > -1) active.splice(i, 1);
  }
}




function parseNmapOutput(stdout: string): OpenPort[] {
  const ports: OpenPort[] = [];
  const lines = stdout.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\d+)\/(tcp|udp)\s+open\s+(.+)$/);
    if (match ) {
      const portNum = parseInt(match[1] || "0", 10);
      const transportStr = (match[2] || "").toLowerCase(); 
      const serviceRaw = (match[3] || "").toLowerCase();
      const serviceWithVersion = match[3] ? match[3].trim() : null;
      
      let transportId: number = PROTOCOLS.TRANSPORT.UNKNOWN;
      if (transportStr === "tcp") transportId = PROTOCOLS.TRANSPORT.TCP;
      if (transportStr === "udp") transportId = PROTOCOLS.TRANSPORT.UDP; 
      
      let appId :number= PROTOCOLS.APP.UNKNOWN;
      if (serviceRaw.includes("http")) appId = PROTOCOLS.APP.HTTP;
      if (serviceRaw.includes("ssl") || serviceRaw.includes("https")) appId = PROTOCOLS.APP.HTTPS;
      if (serviceRaw.includes("ssh")) appId = PROTOCOLS.APP.SSH;
      if (serviceRaw.includes("ftp")) appId = PROTOCOLS.APP.FTP;
      if (serviceRaw.includes("dns")) appId = PROTOCOLS.APP.DNS;
      if (serviceRaw.includes("sql") || serviceRaw.includes("db")) appId = PROTOCOLS.APP.DATABASE;

      ports.push({
        port:portNum,
        protocol: appId,
        transport:transportId,
        service:serviceWithVersion
      });
    }
  }
  return ports;
}

/**
 * Ejecuta un escaneo de puertos rápido y no intrusivo.
 */
async function scanPorts(target: string): Promise<OpenPort[]> {
  try {
    logger.debug("NMAP", `Iniciando escaneo rápido para ${target}`);
    
    /**
     * Argumentos:
     * -F: Escanea los 100 puertos más comunes (muy rápido).
     * --open: Solo muestra puertos abiertos.
     * -T4: Agresividad de tiempo (nivel 4 de 5, ideal para escaneos rápidos).
     * -n: No hace resolución DNS inversa (ya la hicimos nosotros).
     *  -sV Service Version detection 
     *  --version-intensity 0 Intensidad mínima para no mandar demasiados probes
     *  --script=banner Solo pide el banner
     *  -oX Output en formato xml
     */
    const { stdout } = await execa("nmap", ["-F", "--open", "-T2","-n","-sV","--version-intensitity","0","--script-banner","-oX", target], { 
      timeout: 120000,// 2 minutos de timeout
    });

    if (!stdout) return [];

    const discoveredPorts = parseNmapOutput(stdout);
    
    if (discoveredPorts.length > 0) {
      logger.info("NMAP", `Detectados ${discoveredPorts.length} puertos en ${target}`);
    }

    return discoveredPorts;
  } catch (e: unknown) {
   
    logger.error("NMAP", getErrorMessage(e));
    
    return [];
  }
}

export const scanPortsSafe = (target: string) =>
  runWithNmapLimit(() => scanPorts(target));
