import { refineInfraExposure } from "../domain/refineExposure";
import { fingerprintingPhase } from "../phases/03-http";
import { logger } from "../shared/systemLogger";
import type { AnalyzedTarget } from "../shared/types";
import { PHASES, SENSORS } from "../shared/utils/const";
import { normalizeTarget } from "./normalizeJson";

export async function normalizeFlow(
  initialData: AnalyzedTarget, 
  finalResults: AnalyzedTarget[], 
  sub: string,
): Promise<AnalyzedTarget | null> {
  if (!initialData) return null;

  let normalized = normalizeTarget(initialData);

  if (normalized.action !== SENSORS.ACTION.DUPLICATE && normalized.action !== SENSORS.ACTION.SCAN_FAILED) {
    const fullyEnriched = await fingerprintingPhase(normalized);
    if (fullyEnriched) {
      normalized = normalizeTarget(fullyEnriched);
      normalized = refineInfraExposure(normalized);
      logger.info(PHASES.ORCHESTRATOR, `Target completado: ${sub}`);
    }
  } 
  /*   else if (normalized.action === SENSORS.ACTION.DUPLICATE) { */
  /* // const parent = finalResults.find(r => r.ip === normalized.ip && r.open_ports); */
  /* if (parent) { */
  /*   normalized.open_ports = parent.open_ports; */
  /*   normalized.webserver = parent.webserver; */
  /*   normalized = refineInfraExposure(normalized); */
  /* } */
  /* logger.info(PHASES.ORCHESTRATOR, `Omitiendo escaneo profundo (Duplicado): ${sub}`); */
  /* } */

  return normalized;
}
