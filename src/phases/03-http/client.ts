import { execa } from "execa";
import { logger } from "../../shared/systemLogger.ts";
import { generateBypassPayloads, getErrorMessage, getRandomAgent } from "../../shared/utils/utils.ts";
import { normalizedIntel, PROTOCOLS } from "../../shared/utils/const.ts";
import type { BypassAttempt, HttpIntel, WhatWebPluginDetails } from "../../domain/entities/types.ts";
import { getWebPageFingerprinting } from "../../infra/adapters/fingerprinting.adapter.ts";
import { whatwebParser } from "../../infra/mappers/whatweb.mapper.ts";
import { fetchFallback, fetchTargetWithTimeout } from "../../infra/adapters/headers.adapter.ts";
import { httpIntelBuilder, headersFormatter } from "../../infra/mappers/headers.mapper.ts";

export type WhatWebRawResponse = Record<string, WhatWebPluginDetails>;


const agent :string =getRandomAgent() ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0"
;

async function webTechFingerprintingService(target:string) {
  try {
    const rawContent = await getWebPageFingerprinting(target);
 
    const parsedTech= whatwebParser(rawContent);
  
    return parsedTech;
  
  } catch (e) {
    /* handle error */
    logger.error("WEBTECH:", getErrorMessage(e));
  }
}


async function analyzeHeaders(url: string):Promise<HttpIntel> {
  try {

    const response = await fetchTargetWithTimeout(url);
    
  const headers = Object.fromEntries(response.headers.entries());
  const contentLength = parseInt(response.headers.get("content-length") || "0");

    const statusCode=response.status
    const attemps= [{ method:"GET",header:null,status:response.status,size:contentLength,timestamp:new Date().toISOString() }]

    const cookies =!!response.headers.get("set-cookie")
    const parsedResponse= httpIntelBuilder(headers, url,statusCode,attemps,cookies);

    return parsedResponse;
  } catch (error: unknown) {
    
    logger.error("HEADERS", getErrorMessage(error));

    return   await headersFallback(url);
      
  }
}

async function bypassController (baseResults:{protocol:number,status:number},performedAttempts:undefined|BypassAttempt[],url:string) {
   if (baseResults.status===403) {
      logger.warn("HEADERS CURL:",`403 Detectado para ${url}, Iniciando fase de Sniffing`);
      performedAttempts = await performBypassAttempt(url);
      return performedAttempts
    } else {
      performedAttempts=[{ method:"HEAD",header:null,status:baseResults.status,size:0,timestamp:new Date().toISOString() }];
      return performedAttempts
    }
}

async function headersFallback(url:string) :Promise<HttpIntel>{
  try {
    const stdout = await fetchFallback(url)

      const {headers,statusCode}= headersFormatter(stdout) 
    // bypass attempt
    // intentaremos obtener los headers en caso que sea un 403

    const baseResults={
      protocol:url.startsWith("https")? PROTOCOLS.APP.HTTPS:PROTOCOLS.APP.HTTP,
      status:isNaN(statusCode)?0:statusCode,
    };

    let performedAttempts;
  
    performedAttempts = await bypassController(baseResults, performedAttempts, url)
       
    const successfulAttempt = performedAttempts.find(a => a.status === 200); 
    const finalStatus = successfulAttempt ? successfulAttempt.status : baseResults.status;

    return httpIntelBuilder(headers,url,finalStatus,performedAttempts,!!headers["set-cookie"])

  } catch (error:unknown) {
    logger.error("HEADERS-CURL", getErrorMessage(error));
    return { 
      ...normalizedIntel,
      error: getErrorMessage(error), 
      status: 0, 
    };
  } 
}

function compareSize(attempts:BypassAttempt[],status:number,url:string,size:string|undefined,payload:string,s:number) {

         if (attempts.length > 1 && status !== 0) {
          const baseSize =attempts && attempts[0]? attempts[0].size:0;
          if (Math.abs(baseSize - s) > 50) { // Umbral de 50 bytes para evitar ruido de headers
            logger.warn("BYPASS", `Variación detectada en ${payload} (${size} bytes) contra ${url}`);
          }
        }
        
}


async function performBypassAttempt(url: string): Promise<BypassAttempt[]> {
  const attempts: BypassAttempt[] = [];
  // Definimos los headers de bypass que queremos testear

 const bypassPayloads=generateBypassPayloads(url)

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
          status,
          size:s,
          timestamp: new Date().toISOString(),
        });

        compareSize(attempts, status, url, size, payload.name, s)
      
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
    webTechFingerprintingService(url),
  ]);

  return {
    http_intel: intel ||{ error:"Unreachable" },
    http_stack: stack || [],
  };
}
