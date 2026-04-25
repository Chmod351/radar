import { resolveTxt } from "node:dns/promises";
import type {  ASNIntel, DnsPhase } from "../../shared/types.ts";
import { CDN_PROVIDERS } from "../../shared/utils/const.ts";
import { getErrorMessage } from "../../shared/utils/utils.ts";
import { logger } from "../../shared/systemLogger.ts";



export async function getASNInfo(ip: string): Promise<ASNIntel> {
  //  evita consultas basura
  if (!ip || ip === "0.0.0.0") {
    return { asn: null , asn_owner: null, country: null };
  }

  const revIp = ip.split(".").reverse().join(".");
  const query = `${revIp}.origin.asn.cymru.com`;

  try {
    const records = await resolveTxt(query); 
    const firstEntry = records?.[0]?.[0];

    if (firstEntry) {
      const parts = firstEntry.split("|").map(p => p.trim());
      return {
        asn: parts[0] ? `AS${parts[0]}` : null,
        asn_owner: parts[1] || null,
        country: parts[2] || null,
      };
    }
  } catch (e: unknown) {
    // Si el error es NXDOMAIN, la IP no tiene ASN asociado 
    logger.info("ASN-LOOKUP", getErrorMessage(e));
  }

  return { asn: null, asn_owner: null, country: null };
}


