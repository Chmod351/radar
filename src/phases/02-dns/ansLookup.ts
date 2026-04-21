import { resolveTxt } from "node:dns/promises";
import { logger } from "../../shared/errorLogger.ts";
import { getErrorMessage } from "../../shared/utils.ts";
import type {  ASNIntel, DnsPhase } from "../../shared/types.ts";
import { CDN_PROVIDERS } from "../../shared/utils.ts";

export function identifyCDN(asn?:DnsPhase,
  serverHeader?:any,
  headersRaw?:string ) {

  let cdn: number = CDN_PROVIDERS.NONE;
  const sHeader = (serverHeader || "").toLowerCase(); 
  const hRaw = (headersRaw || "").toLowerCase();

  if (sHeader || hRaw) {
    if (sHeader.includes("amazons3")) {
      return { cdn: CDN_PROVIDERS.AWS_S3 }; 
    }
    const signatures = [
      { key: "cloudflare", id: CDN_PROVIDERS.CLOUDFLARE },
      { key: "cloudfront", id: CDN_PROVIDERS.CLOUDFRONT },
      { key: "akamai", id: CDN_PROVIDERS.AKAMAI },
      { key: "fastly", id: CDN_PROVIDERS.FASTLY },
      { key: "google", id: CDN_PROVIDERS.GOOGLE_CDN },
      { key: "x-amz-cf", id: CDN_PROVIDERS.CLOUDFRONT },
      { key: "cf-ray", id: CDN_PROVIDERS.CLOUDFLARE },    
    ];
      // Buscamos la firma en el header 'server'
    for (const sig of signatures) {
      if (sHeader.includes(sig.key) || hRaw.includes(sig.key)) {
        cdn = sig.id;
        break;
      }
    }
    if (cdn === CDN_PROVIDERS.NONE && (hRaw.includes("cdn") || hRaw.includes("cache"))) {
      cdn = CDN_PROVIDERS.UNKNOWN_CDN;
    }
  }
  if (cdn === CDN_PROVIDERS.NONE && asn) {
    const owner = (asn.asn_owner || "").toLowerCase();
    if (owner.includes("cloudflare")) cdn = CDN_PROVIDERS.CLOUDFLARE;
    if (owner.includes("amazon") || owner.includes("aws")) cdn = CDN_PROVIDERS.CLOUDFRONT;
    if (owner.includes("google")) cdn = CDN_PROVIDERS.GOOGLE_CDN;
  }
  return {
    cdn:cdn,
  };
}

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


