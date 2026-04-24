import { getErrorMessage, PROTOCOLS, USER_AGENTS } from "../../shared/utils.ts";
import { logger } from "../../shared/errorLogger.ts";
import { execa } from "execa";
import { unlink, readFile } from "node:fs/promises";
import type {  BypassAttempt, HttpIntel, Technology, WhatWebPluginDetails } from "../../shared/types.ts";
import { normalizedIntel } from "./";
import { existsSync } from "node:fs";

type WhatWebRawResponse = Record<string, WhatWebPluginDetails>;

/**
 * Sensor WhatWeb: Fingerprinting profundo de tecnologías.
 * Se encarga de la ejecución binaria y el filtrado de ruido.
 */
export class WhatWebService {
  private noise = [
    "IP", "HTTPServer", "Country", "Date", "BaseID",
    "Title", "HTML5", "Script", "X-UA-Compatible", "Email",
  ];

  async scan(target: string): Promise<Technology[]> {
    const tempFile = `/tmp/whatweb_${Date.now()}_${Math.random().toString(36).slice(2)}.json`;
    try {
      await execa("whatweb", [
        "--color=never",
        "--no-errors",
        `--log-json=${tempFile}`,
        target,
      ], { reject: false, timeout: 25000 });

      if (!existsSync(tempFile)) return []; 
      const rawContent = await readFile(tempFile, "utf-8");
      try { await unlink(tempFile); } catch (e) { logger.error("WHATWEB", getErrorMessage(e)); }

      if (!rawContent || rawContent.trim() === "" || !rawContent.includes("[")) return [];

      const jsonStart = rawContent.indexOf("[");
      const jsonEnd = rawContent.lastIndexOf("]"); 
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) return []; 
      const cleanJson = rawContent.substring(jsonStart, jsonEnd + 1); 

      const parsed = JSON.parse(cleanJson);
      if (!Array.isArray(parsed) || parsed.length === 0) return []; 
      const lastResult=parsed[parsed.length -1];
      const rawPlugins = (lastResult.plugins || {}) as WhatWebRawResponse;
      return this.parsePlugins(rawPlugins);

    } catch (error: unknown) {
      logger.error("WHATWEB", getErrorMessage(error));
      try { await unlink(tempFile); } catch (error:unknown){
        logger.error("UNLINK", getErrorMessage(error));
      }
      return [];
    }
  }

  private parsePlugins(plugins: WhatWebRawResponse): Technology[] {
    return Object.entries(plugins)
      .filter(([name]) => !this.noise.includes(name))
      .map(([name, details]): Technology => {
        const version = 
          details.version?.[0] || 
          details.string?.[0] || 
          details.module?.[0] || 
          "unknown";

        return {
          name,
          version,
        };
      })
      .filter(t => 
        t.version !== "unknown" || 
        ["Nginx", "Apache", "PHP", "WordPress", "Docker", "Cloudflare", "Laravel"].includes(t.name),
      );
  }
}

const scanner = new WhatWebService();

/**
 * Análisis de Headers: Seguridad y Metadatos.
 */
const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || USER_AGENTS[0];
const agent :string =getRandomAgent() ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0"
;

async function analyzeHeaders(url: string):Promise<HttpIntel> {
  try {
    const agent = getRandomAgent();
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": agent } as Record<string, string>,
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(id);
    const headers = Object.fromEntries(response.headers.entries());
    const contentLength = parseInt(response.headers.get("content-length") || "0");
    return {
      protocol: url.startsWith("https") ? PROTOCOLS.APP.HTTPS : PROTOCOLS.APP.HTTP,
      status: response.status,
      security: {
        hsts: !!headers["strict-transport-security"],
        csp: !!headers["content-security-policy"],
        xfo: !!headers["x-frame-options"],
        nosniff: !!headers["x-content-type-options"],
      },
      server: headers["server"] || null,
      poweredBy: headers["x-powered-by"] || headers["server"] || null,
      cookies: !!response.headers.get("set-cookie"), 
      attempts:[{ method:"GET",header:null,status:response.status,size:contentLength,timestamp:new Date().toISOString() }],
    };
  } catch (error: unknown) {
    
    logger.error("HEADERS", getErrorMessage(error));

    return   await headersFallback(url);
      
  }
}


async function headersFallback(url:string) :Promise<HttpIntel>{
  try {
    const { stdout, stderr } = await execa("curl", [
      "-I",                      // Solo headers
      "-s",                      // Silent
      "-L",                      // Seguir redirecciones
      "-k",                      
      "--max-time", "10",
      "-A", agent,
      url,
    ], { reject: false });
    if (!stdout) {
      throw new Error(`Curl no devolvio headers:${stderr}`);
    }
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
   

    // bypass attempt
    // intentaremos obtener los headers en caso que sea un 403

    const baseResults={
      protocol:url.startsWith("https")? PROTOCOLS.APP.HTTPS:PROTOCOLS.APP.HTTP,
      status:isNaN(statusCode)?0:statusCode,
    };

    let performedAttempts;

    if (baseResults.status===403) {
      logger.warn("HEADERS CURL:",`403 Detectado para ${url}, Iniciando fase de Sniffing`);
      performedAttempts = await performBypassAttempt(url);
    } else {
      performedAttempts=[{ method:"HEAD",header:null,status:baseResults.status,size:0,timestamp:new Date().toISOString() }];
    }
    
    const successfulAttempt = performedAttempts.find(a => a.status === 200); 
    const finalStatus = successfulAttempt ? successfulAttempt.status : baseResults.status;

    return {
      protocol: url.startsWith("https") ? PROTOCOLS.APP.HTTPS : PROTOCOLS.APP.HTTP,
      status: finalStatus,
      security: {
        hsts: !!headers["strict-transport-security"],
        csp: !!headers["content-security-policy"],
        xfo: !!headers["x-frame-options"],
        nosniff: !!headers["x-content-type-options"],
      },
      server: headers["server"] || null,
      poweredBy: headers["x-powered-by"] || headers["server"] || null,
      cookies: !!headers["set-cookie"], 
      attempts:performedAttempts,
    };
  } catch (error:unknown) {
    logger.error("HEADERS-CURL", getErrorMessage(error));
    return { ...normalizedIntel,
      error: getErrorMessage(error), 
      status: 0, 
    };
  } 
}

async function performBypassAttempt(url: string): Promise<BypassAttempt[]> {
  const attempts: BypassAttempt[] = [];
  // Definimos los headers de bypass que queremos testear
  const bypassPayloads = [
    { name: "Base", header: null },
    { name: "X-Forwarded-For", header: "X-Forwarded-For: 127.0.0.1" },
    { name: "X-Original-URL", header: "X-Original-URL: /admin" },
    { name:"X-Forwarded-For-127",header:"X-Originating-IP:  127.0.0.1" },
    { name:"X-Remote-Ip",header:"X-Remote-IP: 127.0.0.1" },
    { name:"X-Remote-Addr",header: "X-Remote-Addr: 127.0.0.1" },
    { name:"X-Client-IP",header:"X-Client-IP: 127.0.0.1" },
    { name:"X-Host", header: "X-Host: 127.0.0.1" },
    { name:"X-Forwarded-Host",header : "X-Formwarded-Host: localhost" },
    { name: "X-Rewrite-URL", header: `X-Rewrite-URL: ${url.endsWith("/") ? url : url + "/"}`, 
    },
  ];

  for (const payload of bypassPayloads) {
    const jitter = Math.floor(Math.random() * 500);
    await Bun.sleep(jitter); // añadi latencia artificial a las requests para intentar evitar los WAF
    try {
      // Usamos -w para obtener el HTTP CODE y el SIZE_DOWNLOAD al final del output
      const args = [
        "-s", "-L", "-k",
        "--max-time", "10",
        "-A", agent,
        "-o", "/dev/null", // sin el body en el stdout
        "-w", "%{http_code},%{size_download}", // formateamos el codigo y el tamaño
        url,
      ];

      if (payload.header) {
        args.push("-H", payload.header);
      }

      const { stdout } = await execa("curl", args, { reject: false });
      
      if (stdout) {
        const [statusCode, size] = stdout.split(",");
        const status =statusCode? parseInt(statusCode) : 0;
        const s =size? parseInt(size) : 0;
        
        attempts.push({
          method: "GET",
          header: payload.header,
          status:statusCode? parseInt(statusCode) : 0,
          size:size? parseInt(size) : 0,
          timestamp: new Date().toISOString(),
        });

        if (attempts.length > 1 && status !== 0) {
          const baseSize =attempts && attempts[0]? attempts[0].size:0;
          if (Math.abs(baseSize - s) > 50) { // Umbral de 50 bytes para evitar ruido de headers
            logger.warn("BYPASS", `Variación detectada en ${payload.name} (${size} bytes) contra ${url}`);
          }
        }
      }
    } catch (error) {
      logger.error("BYPASS-ATTEMPT", `Error probando ${payload.name}: ${getErrorMessage(error)}`);
    }
  }

  return attempts;
}

export async function getWebIntel(url: string) {
  const [intel, stack] = await Promise.all([
    analyzeHeaders(url),
    scanner.scan(url),
  ]);

  return {
    http_intel: intel ||{ error:"Unreachable" },
    http_stack: stack || [],
  };
}
