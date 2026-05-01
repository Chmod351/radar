import { getWebIntel } from "./client.ts";
import {  scanPortsSafe } from "./portsScan.ts";
import type { AnalyzedTarget, HttpIntel } from "../../shared/types";
import { identifyCDN } from "../02-dns/ansLookup.ts";
import { PROTOCOLS } from "../../shared/utils/const.ts";
import { normalizeHttpIntel } from "../../parsers/normalizeJson.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { logger } from "../../shared/systemLogger.ts";


export async function fingerprintingPhase(target: AnalyzedTarget): Promise<AnalyzedTarget> {
  const host = target.host;

  try {
    // Disparamos las 2 consultas en paralelo para este host específico

    const [httpData, openPorts] = await Promise.all([
      getWebIntel(target.url),
      scanPortsSafe(host),
    ]);
    
    const httpIntelNormalized=normalizeHttpIntel(httpData.http_intel as HttpIntel);

    const   webserver= httpIntelNormalized.server || httpData.http_stack?.[0]?.name;
    const   headersRaw= JSON.stringify(httpData.http_stack || {});

    const { cdn } = identifyCDN(target,webserver,headersRaw);
    return {
      ...target,
      http_intel: httpIntelNormalized || normalizedIntel,
      http_stack: httpData.http_stack,
      open_ports: openPorts || [],
      cdn,
    };
  } catch (error: unknown) {
    logger.error("PHASE-03", getErrorMessage(error));

    return { ...target,
      http_intel:{ ...normalizedIntel,
        error:getErrorMessage(error)?? "Fallo el fingerprinting", 
      },
      http_stack:target.http_stack,
      open_ports:target.open_ports, 
    };
  }
}
