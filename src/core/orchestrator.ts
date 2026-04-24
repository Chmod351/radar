import { reconPhase } from "../phases/01-recon";
import { dnsPhaseStream } from "../phases/02-dns";
import { dashboard } from "../ui/dashboard.ts";
import type { AnalyzedTarget } from "../shared/types.ts";
import { logger } from "../shared/systemLogger.ts";
import { PHASES } from "../shared/utils/const.ts";
import { normalizeTarget } from "../parsers/normalizeJson.ts";
import { getErrorMessage, OP_DIR, TARGET } from "../shared/utils/utils.ts";
import { normalizeScanTarget } from "../parsers/urlNormalizer.ts";
import { normalizeFlow } from "../parsers/normalizerFlow.ts";

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
         const result = await normalizeFlow(normalized as AnalyzedTarget, finalResults, sub);
         if (result) {
           finalResults.push(result)
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
