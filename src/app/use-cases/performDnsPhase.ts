import { withRetry } from "../../shared/retry.ts";
import { SENSORS } from "../../shared/utils/const.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { logger } from "../../shared/systemLogger.ts";
import { classifyTarget } from "../../domain/classifyTarget.ts";
import { enrichWebData, resolveSingleDomain } from "../../phases/02-dns/resolver.ts";
import { getASNInfo } from "../../phases/02-dns/ansLookup.ts";
import { identifyCDN } from "../../domain/services/cdnDetector.ts";
import type { AnalyzedTarget } from "../../domain/entities/types.ts";
import { getWhoisIntel } from "../../phases/02-dns/whois.ts";

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
      analyzed.whois = await withRetry(`Whois:${subdomain}`, () => getWhoisIntel(subdomain));
    }

    return analyzed;
  } catch (error: unknown) {
    logger.error("DNS-PHASE", getErrorMessage(error));
    return null;
  }
}

