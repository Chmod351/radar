import type { WebMetadata } from "../../domain/entities/types";

export function httpParser(stdout:string,host:string): WebMetadata {

    if (!stdout.trim()) throw new Error("No web response");
    const data = JSON.parse(stdout);
   
     
    return {
      url: data.url || `http://${host}`,
      status_code: data.status_code || data["status-code"] || 0,
      title: data.title || null,
      webserver: data.web_server || data.server || data.webserver || null,
      cdn:null,
    }; 
}

