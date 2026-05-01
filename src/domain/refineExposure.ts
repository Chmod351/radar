import { SENSORS } from "../shared/utils/const";
import type { AnalyzedTarget } from "./entities/types";

export function refineInfraExposure(target: AnalyzedTarget): AnalyzedTarget {
  const serverHeader = (target.webserver || "").toLowerCase();
  const openPorts = target.open_ports || [];
  
  // 1. SEÑALES DE ORIGIN (Certeza absoluta)
  // Si Nmap encontró servicios de administración o DB expuestos
  const hasInfraPorts = openPorts.some(p => 
    [21, 22, 25, 110, 143,3000, 3306, 5432,5060, 8080, 8443].includes(p.port),
  );

  // Si el server reporta ser un software crudo sin intermediarios
  const isRawServer = ["apache", "nginx", "lighttpd", "litespeed"].some(s => 
    serverHeader.includes(s),
  );

  // 2. LÓGICA DE ACTUALIZACIÓN
  let finalInfra = target.infra_type;

  // Si antes era UNKNOWN 
  if (hasInfraPorts || isRawServer) {
    finalInfra = SENSORS.INFRA_TYPE.SELF_HOSTED; 
  } 
  
  // Caso especial: Si Nmap no devolvió NADA y no hay headers de server, 
  // pero el ASN decía Cloud, lo mantenemos como CLOUD.
  
  let priority = target.priority;
  if (openPorts.some(p => [3306, 21, 22,5060,2000].includes(p.port))) {
    priority = SENSORS.PRIORITY.CRITICAL; 
  }

  return {
    ...target,
    infra_type: finalInfra,
    priority,
  };
}


