import type { DnsPhase } from "../../shared/types";
import { CDN_PROVIDERS } from "../../shared/utils/const";

export function identifyCDN(asn?:DnsPhase,
  serverHeader?:string,
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
    // si no detectamos CDN, pero el CDN O CACHE  viene en el header es CDN
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
