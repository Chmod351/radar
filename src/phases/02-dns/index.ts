import { resolveSingleDomain, enrichWebData} from "./resolver.ts";
import { getASNInfo, identifyCDN } from "./ansLookup.ts";
import { getWhoisIntel } from "./whois.ts";
import { withRetry } from "../../shared/retry.ts";
import type {  AnalyzedTarget } from "../../shared/types.ts";
import { SENSORS } from "../../shared/utils/const.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { logger } from "../../shared/systemLogger.ts";
import { classifyTarget } from "../../domain/classifyTarget.ts";

export async function dnsPhaseStream(subdomain: string): Promise<Partial<AnalyzedTarget> | null> {
  try {
    const resolved = await withRetry(`DNS:${subdomain}`, () => resolveSingleDomain(subdomain));
    if (!resolved || resolved.ip === "0.0.0.0") return null;

    const [asnInfo, webInfo] = await Promise.all([
      withRetry(`ASN:${resolved.ip}`, () => getASNInfo(resolved.ip)),
      withRetry(`WEB:${subdomain}`, () => enrichWebData(subdomain)),
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

