import type { AnalyzedTarget, Fingerprint } from "../shared/types";
import { CDN_PROVIDERS } from "../shared/utils";



function fingerprintServer(server: string|null): Fingerprint {
  if (!server) return { product: null,server:null,version:null };

  const s = server.toLowerCase();
  
  // Regex genérico para capturar "CualquierCosa/1.2.3"
  const genericMatch = s.match(/([a-z0-9\-]+)\/([\d.]+)/i);
  
  if (genericMatch) {
    return { 
      product: genericMatch[1] ||null, 
      version: genericMatch[2] ||null, 
      server: s, 
    };
  }

  return { product: "unknown", version: null, server: s };
}

export function scoreWeakness(item:AnalyzedTarget) {
  let score = 0;

  const sec = item.http_intel?.security || {};

  if (!sec.hsts) score += 5;
  if (!sec.csp) score += 5;
  if (!sec.xfo) score += 3;
  if (!sec.nosniff) score += 3;
  

  const fp = fingerprintServer(item.webserver);
  if (fp.product && fp.product !=="unknown")score +15;
  if (fp.product === "unknown" && item.webserver) score += 2; // Penalización por "Obscuridad"
  if (fp.version)score +20;

  if (item.cdn === CDN_PROVIDERS.NONE) score += 10;

  return score;
}
