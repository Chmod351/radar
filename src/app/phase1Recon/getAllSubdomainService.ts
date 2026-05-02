import { runSubdomainStream } from "../../infra/adapters/subdomain.adapter";
import { logger } from "../../shared/systemLogger";
import { PHASES } from "../../shared/utils/const";
import { getReconSources } from "../phase1Recon/reconSources";
 
/**
 * FASE 1: RECON (Paralelismo Real y Deduplicación en Vuelo)
 * Ambas fuentes corren en paralelo. El primero que encuentra, emite.
 */
export async function* streamAllSubdomains(target: string): AsyncIterable<string> {
  const seen = new Set<string>(); // Memoria para evitar duplicados
  logger.info(PHASES.RECON, `[*] Radar activado: Escaneo paralelo para ${target}`);
  const sources=getReconSources(target);
  // Cola intermedia para los hallazgos
  const outputQueue: string[] = [];
  let activeSources = sources.length;

  let signalResolver: (() => void) | null = null;

  // LANZAMIENTO PARALELO 
  sources.forEach(async (source) => {
    try {
      for await (const sub of runSubdomainStream(source.cmd, source.args)) {
        // DEDUPLICACIÓN  
        // faltaria integrar la eliminacion de unicode en el flujo
        if (!seen.has(sub)) {
          seen.add(sub);
          outputQueue.push(sub);
          
          if (signalResolver) {
            signalResolver();
            signalResolver = null;
          }
        }
      }
    } finally {
      activeSources--;
      if (signalResolver) {
        signalResolver();
        signalResolver = null;
      }
      logger.info(PHASES.RECON, `Fuente ${source.name} completada.`);
    }
  });

  //  Mantiene el flujo vivo mientras haya datos o fuentes vivas
  while (activeSources > 0 || outputQueue.length > 0) {
    if (outputQueue.length > 0) {
      yield outputQueue.shift()!;
    } else {
      await new Promise<void>((resolve) => {
        signalResolver = resolve;
      });
    }
  }

  logger.info(PHASES.RECON, `[#] Recon finalizado. Objetivos únicos: ${seen.size}`);
}
