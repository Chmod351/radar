import type { AnalyzedTarget } from "../shared/types";
import { SENSORS } from "../shared/utils/const";
import { criticalKeywords } from "../shared/utils/data";

export function scoreImpact(item:AnalyzedTarget) {
  let score = 0;

  // Dominio sensible
  const sensitive = criticalKeywords;
  if (sensitive.some(k => item.host.includes(k))) score += 40;

  // Infra propia
  if (item.infra_type === SENSORS.INFRA_TYPE.SELF_HOSTED) score += 10;
  //STACK VULNERABLE (PHP es un imán de problemas en manos inexpertas)
  if (item.http_stack?.some(s => s.name === "Cookies" && s.version === "PHPSESSID")) score += 10;


  return score;
}
