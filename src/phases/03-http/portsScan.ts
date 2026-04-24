import { execa } from "execa";
import type { OpenPort } from "../../shared/types.ts";
import { logger } from "../../shared/systemLogger.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { parseNmapOutput } from "../../parsers/parserNmap.ts";



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
    const { stdout } = await execa("nmap", ["-F", "--open", "-T3","-n","-sV","--version-intensity","0","--script=banner", target], { 
      timeout: 120000,// 2 minutos de timeout
    });

    if (!stdout) return [];

    const discoveredPorts = parseNmapOutput(stdout);
    
    if (discoveredPorts.length > 0) {
      logger.info("NMAP", `Detectados ${discoveredPorts.length} puertos en ${target}`);
    }
    console.log("NMAP stdout: ",stdout);
    return discoveredPorts;
  } catch (e: unknown) {
   
    logger.error("NMAP", getErrorMessage(e));
    
    return [];
  }
}

export const scanPortsSafe = (target: string) =>
  runWithNmapLimit(() => scanPorts(target));
