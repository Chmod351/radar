import type { AnalyzedTarget } from "../../domain/entities/types";
import { refineInfraExposure } from "../../domain/refineExposure";
import { fingerprintingPhase } from "../../phases/03-http";
import { logger } from "../../shared/systemLogger";
import { PHASES, SENSORS } from "../../shared/utils/const";
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
   return normalized;
}
