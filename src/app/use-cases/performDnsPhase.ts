import { SENSORS } from "../../shared/utils/const.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { logger } from "../../shared/systemLogger.ts";
import { classifyTarget } from "../../domain/classifyTarget.ts";
import { identifyCDN } from "../../domain/services/cdnDetector.ts";
import type { AnalyzedTarget } from "../../domain/entities/types.ts";
import { enrichWebData, getASNInfo, getWhoisIntel, resolveSingleDomain } from "../phase2Dns/dnsServices.ts";

export async function dnsPhaseStream(subdomain: string): Promise<Partial<AnalyzedTarget> | null> {
  try {
    const resolved = await resolveSingleDomain(subdomain)
    if (!resolved || resolved.ip === "0.0.0.0") return null;

    const [asnInfo, webInfo] = await Promise.all([
      getASNInfo(resolved.ip),
      enrichWebData(subdomain),
    ]);

    const baseData= {
      ...resolved,
      ...webInfo,
      ...asnInfo,
    };
    const { cdn }= identifyCDN(baseData);
    baseData.cdn=cdn;
    
    const analyzed = classifyTarget(baseData);
    if (analyzed.action === SENSORS.ACTION.READY) {
      analyzed.whois = await getWhoisIntel(subdomain)
    }

    return analyzed;
  } catch (error: unknown) {
    logger.error("DNS-PHASE", getErrorMessage(error));
    return null;
  }
}

