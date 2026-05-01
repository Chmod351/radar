import type {  ASNIntel } from "../../shared/types.ts";
import { cymruService } from "../../infra/adapters/asnInfo.adapter.ts";
import { isValididIp } from "../../domain/services/validateIpForASN.ts";
import { asnMapper } from "../../infra/mappers/asn.mapper.ts";


const emptyResults={asn:null,asn_owner:null,country:null}

export async function getASNInfo(ip: string): Promise<ASNIntel> {
  if (!isValididIp(ip)) {
    return emptyResults
  }    
    const firstEntry= await cymruService(ip)
    if (!firstEntry) {
     return emptyResults
    }
  return asnMapper(firstEntry)
}


