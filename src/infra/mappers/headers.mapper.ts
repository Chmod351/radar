import type { HttpIntel } from "../../domain/entities/types";
import { PROTOCOLS } from "../../shared/utils/const";

export function httpIntelBuilder(
  headers:
    {[k:string]:string}, 
  url:string, 
  status:number,
  attempts:
    {method:string,
      header:null|string,
      status:number, 
      size:number, 
      timestamp:string}[],
  cookies:boolean
):HttpIntel {
  return {
    protocol: url.startsWith("https") ? PROTOCOLS.APP.HTTPS : PROTOCOLS.APP.HTTP,
    status,
    security: {
      hsts: !!headers["strict-transport-security"],
      csp: !!headers["content-security-policy"],
      xfo: !!headers["x-frame-options"],
      nosniff: !!headers["x-content-type-options"],
    },
    server: headers["server"] || null,
    poweredBy: headers["x-powered-by"] || headers["server"] || null,
    cookies,
    attempts,
  };
}


export function headersFormatter(stdout:string) {
const headersRaw = stdout.split("\r\n");
const headers: Record<string,string>={}; 
    
    headersRaw.forEach(line => {
      const parts = line.split(": ");
      if (parts.length >= 2 && parts[0]) {
        const key = parts[0].toLowerCase();
        const value = parts.slice(1).join(": ").trim();
        headers[key] = value;
      }
    });
    const statusLine=headersRaw[0];
    const statusParts = statusLine ? statusLine.split(" "): [];
    const statusCode = statusParts.length>=2 && statusParts[1] ? parseInt(statusParts[1]):0;

    return {statusCode,headers}
    
}
