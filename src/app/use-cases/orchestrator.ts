import type { AnalyzedTarget } from "../../domain/entities/types";
import { refineInfraExposure } from "../../domain/refineExposure";
import { normalizeTarget } from "../../infra/mappers/normalizeJson";
import { normalizeFlow } from "../../infra/mappers/normalizerFlow";
import { normalizeScanTarget } from "../../infra/mappers/urlNormalizer";
import { logger } from "../../shared/systemLogger";
import { PHASES, SENSORS } from "../../shared/utils/const";
import { getErrorMessage, OP_DIR, TARGET } from "../../shared/utils/utils";
import { dashboard } from "../../ui/dashboard";
import { dnsPhaseStream } from "./performDnsPhase";
import { streamAllSubdomains } from "./subdomainFinder";

export class Orchestrator {
  // por defecto 15 para mas velocidad o bajarlo para reducir carga en el procesador
  private concurrencyLimit =  4;

  async start(target: string) {
    const finalResults: AnalyzedTarget[] = [];
    const activeWorkers = new Set<Promise<void>>();
    logger.info(PHASES.ORCHESTRATOR, "iniciando....");



    // Fase 1: Sigue siendo un Stream (la fuente)
    const subdomainStream = streamAllSubdomains(target);
    for await (const sub of subdomainStream) {
      if (activeWorkers.size >= this.concurrencyLimit) {
        await Promise.race(activeWorkers);
      }
      const worker = (async () => {
        try {
          const analyzed = await dnsPhaseStream(sub);
          
          let normalized:AnalyzedTarget=normalizeTarget(analyzed as AnalyzedTarget);
          const result = await normalizeFlow(normalized as AnalyzedTarget, finalResults, sub);
          if (result) {
            finalResults.push(result);
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
   
    const finalConsolidatedData = finalResults.map(target => {
      if (target.action === SENSORS.ACTION.DUPLICATE) {
        // Ahora sí, tenemos la CERTEZA de que el padre está en finalResults
        const parent = finalResults.find(r => r.ip === target.ip && r.open_ports && r.open_ports.length > 0);
        if (parent) {
          return refineInfraExposure({
            ...target,
            open_ports: parent.open_ports,
            webserver: parent.webserver,
            http_intel: parent.http_intel,
          });
        }
      }
      return target;
    });

    try {
      await Bun.write(Bun.file(path), JSON.stringify(finalConsolidatedData,null,2));
    } catch (e){
      logger.error(PHASES.ORCHESTRATOR,`ERROR AL INTENTAR ESCRIBIR LA DATA ${e}, ${path}, ${OP_DIR}`);
    }
    return dashboard(finalConsolidatedData);
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
