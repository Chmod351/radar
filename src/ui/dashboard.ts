import type { AnalyzedTarget, Technology } from "../shared/types";
import { calculatePriority } from "../domain/calculatePriority.ts";
import { calculateStatus, getServerInfo } from "../domain/calculateStatus.ts";
import { noise } from "../shared/utils/data.ts";
import { SENSORS } from "../shared/utils/const.ts";

const REAL_TECH_FILTER = (t: Technology) => {
 
  return !noise.some(n => t.name.includes(n));
};


const infraTranslatorForDashboard=(infraStatus:number)=>{
  const status=["ERR","N/A","MANG","VULN","REV-REQ","SEC","GEN"];

  return status[infraStatus];
};

const cdnTranslatorForDashboard=(value:number)=>{
  const cdnProvider=["NN","C-FLARE","AKAMAI","C-FRONT","FASTLY","INCAP","G-CDN","GITHUB_CDN","AWS_S3", "UNKNOWN_CDN"];
  return cdnProvider[value];
};

/**
 * Renderiza la tabla final en la terminal.
 */
export function dashboard(finalReport: AnalyzedTarget[]): void {

  const sortedReport = finalReport.sort((a, b) => {
    // Ponemos los que tienen puertos abiertos primero
    const aPorts = a.open_ports?.length || 0;
    const bPorts = b.open_ports?.length || 0;
    return bPorts - aPorts; 
  });
  const tableFriendlyReport = sortedReport.map(item => {
    const intel = item.http_intel || {};
    // FILTRAMOS AQUÍ: Solo lo que no sea ruido
    const rawStack = item.http_stack || [];
    const cleanStack = rawStack.filter(REAL_TECH_FILTER);
    const portsSummary = item.open_ports && item.open_ports.length > 0
      ? item.open_ports.map(p => `${p.port}/${p.service}`).join(", ")
      : "--";
   
    const sec = intel.security  || { hsts: false };
    
    // Usamos las funciones que ya corregiste
    const realStatus = calculateStatus(item);
    const priorityLabel = calculatePriority(item);

    const infraStatus=infraTranslatorForDashboard(item.infra_status||0);
    let cdnProvider;
    if (item.cdn) {
      
      cdnProvider= cdnTranslatorForDashboard(item.cdn);
    }

    // Mandamos el stack limpio para el resumen de texto
    const { serverInfo, techSummary } = getServerInfo(item, intel, cleanStack);

    return {
      host: item.host.substring(0, 40), // Limitar para que no rompa la terminal
      status: realStatus && item.action ===SENSORS.ACTION.DUPLICATE ? realStatus + "/D": realStatus,
      priority: priorityLabel,
      HSTS: (intel.error === "Unreachable") ? "--" : (sec.hsts ? "✔️" : "❌"),
      // app: item.app_status,
      cdn: cdnProvider || "??" ,
      tech: techSummary.substring(0,20),
      asn:item.asn_owner,
      ip:item.ip,
      type:item.infra_type===2?"S-Host": (item.infra_type?"Cloud":"Unk"),
      infra: infraStatus,
      server: serverInfo.slice(0, 15),
      ports:portsSummary,
    };
  });

  console.table(tableFriendlyReport.slice(0,40));
}
