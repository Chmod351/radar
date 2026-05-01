
import { resolveTxt } from "node:dns/promises";
import { logger } from "../../shared/systemLogger";
import { getErrorMessage } from "../../shared/utils/utils";


async function DNSRawResolver(query:string) {
  try {
    const records = await resolveTxt(query); 
    return records
  } catch (e) {
    /* handle error */
    logger.error("ASN INFO", getErrorMessage(e))
    throw e
  }
  
} 


export async function cymruService(ip:string) {
    const revIp = ip.split(".").reverse().join(".");
    const query = `${revIp}.origin.asn.cymru.com`;
try {
    const records =  await DNSRawResolver(query)

   const firstEntry =  records?.[0]?.[0];

   return firstEntry

} catch (e) {
  /* handle error */
  return null
}
  }
