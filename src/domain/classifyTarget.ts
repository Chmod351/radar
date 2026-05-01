
import { SENSORS } from "../shared/utils/const";
import { cloudNoise } from "../shared/utils/data";
import type { AnalyzedTarget, DnsPhase } from "./entities/types";

const globalFingerprints= new Set<string>();

export function classifyTarget(domainData: DnsPhase): Partial<AnalyzedTarget> {
  const asnOwner = (domainData.asn_owner || "").toLowerCase();
  const isNoise = cloudNoise.some(key => asnOwner.includes(key));

  const fingerprint = `${domainData.ip}_${domainData.status_code}_${domainData.title}`;


  let action:number = SENSORS.ACTION.SKIP;
  let priority:number = SENSORS.PRIORITY.LOW; 

  if (globalFingerprints.has(fingerprint)) {
    return { ...domainData, 
      infra_type:isNoise?SENSORS.INFRA_TYPE.CLOUD:SENSORS.INFRA_TYPE.UNKNOWN 
      , action: SENSORS.ACTION.DUPLICATE ,
      priority,
    };
  }

  globalFingerprints.add(fingerprint);
 
  if (isNoise) {
    return { ...domainData, 
      infra_type:SENSORS.INFRA_TYPE.CLOUD ,
      priority,
      action, 
    };
  }
  priority=SENSORS.PRIORITY.HIGH; 
  action=SENSORS.ACTION.READY;

  return {
    ...domainData,
    priority,
    infra_type: SENSORS.INFRA_TYPE.UNKNOWN,
    action,
  };
}
