import { reconPhase } from "../phases/01-recon";
import { dnsPhaseStream } from "../phases/02-dns";
import { fingerprintingPhase } from "../phases/03-http";
import { getErrorMessage, OP_DIR, PHASES, SENSORS, TARGET } from "../shared/utils.ts";
import { logger } from "../shared/errorLogger.ts";
import { dashboard } from "../ui/dashboard.ts";
import type { AnalyzedTarget } from "../shared/types.ts";
import { normalizeTarget } from "../shared/helper.ts";
import { normalizeScanTarget } from "../shared/urlNormalizer.ts";
import { refineInfraExposure } from "../phases/02-dns/resolver.ts";

export class Orchestrator {
  // por defecto 15 para mas velocidad o bajarlo para reducir carga en el procesador
  private concurrencyLimit =  4;

  async start(target: string) {
    const finalResults: AnalyzedTarget[] = [];
    const activeWorkers = new Set<Promise<void>>();
    logger.info(PHASES.ORCHESTRATOR, "iniciando....");



    // Fase 1: Sigue siendo un Stream (la fuente)
    const subdomainStream = reconPhase(target);
    for await (const sub of subdomainStream) {
      if (activeWorkers.size >= this.concurrencyLimit) {
        await Promise.race(activeWorkers);
      }
      const worker = (async () => {
        try {
          const analyzed = await dnsPhaseStream(sub);
          
          let normalized:AnalyzedTarget=normalizeTarget(analyzed as AnalyzedTarget);

          if (normalized) {
            if (normalized.action !== SENSORS.ACTION.DUPLICATE &&  normalized.action !==SENSORS.ACTION.SCAN_FAILED) {
              const fullyEnriched = await fingerprintingPhase(normalized);
              if (fullyEnriched) {
                normalized=normalizeTarget(fullyEnriched);
                normalized=refineInfraExposure(normalized);
                finalResults.push(normalized);
                logger.info(PHASES.ORCHESTRATOR, `Target completado: ${sub}`);
              }
            } else {
              finalResults.push(normalized);
              logger.info(PHASES.ORCHESTRATOR, `Omitiendo escaneo profundo para : ${sub}`);
            }
            if (normalized.action ===SENSORS.ACTION.DUPLICATE) {
              const parent = finalResults.find(r => r.ip === normalized.ip && r.open_ports);
              if (parent) {
                normalized.open_ports = parent.open_ports;
                normalized.webserver = parent.webserver;
                normalized = refineInfraExposure(normalized);
              }
            }
          }
        } catch (e:unknown) {
          logger.error(PHASES.ORCHESTRATOR,getErrorMessage(e) );
        }
      })();

      activeWorkers.add(worker);
      worker.finally(() => activeWorkers.delete(worker));
    }

    await Promise.all(activeWorkers);
    console.log(finalResults);
    console.log(`\n[🏁] ESCANEO FINALIZADO. Objetivos: ${finalResults.length}`);
    const path = `${OP_DIR}/${TARGET}.json`;



    const normalizedFinalData = finalResults.map(target => normalizeTarget(target));

    try {
      await Bun.write(Bun.file(path), JSON.stringify(normalizedFinalData,null,2));
    } catch (e){
      logger.error(PHASES.ORCHESTRATOR,`ERROR AL INTENTAR ESCRIBIR LA DATA ${e}, ${path}, ${OP_DIR}`);
    }
    return dashboard(normalizedFinalData);
  }
}





async function main(target:string) {
 
  const orchestrator = new Orchestrator(); 
  try {
    await orchestrator.start(target);
  } catch (error) {
    logger.error(PHASES.ORCHESTRATOR,`ERROR AL INTENTAR EJECUTAR EL ORQUESTADOR ${error}`);
    process.exit(1);
  }
}

if (TARGET) {
  main(normalizeScanTarget(TARGET));
}
