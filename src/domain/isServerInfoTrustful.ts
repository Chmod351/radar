export function isServerInfoTrustful(httpServer:string|null,nmapServer:string|null):Boolean {
  if (!httpServer || !nmapServer)return false
    

    const cleanHttp=httpServer.toLowerCase().split("/")[0]?.trim() 
    const cleanNmap=nmapServer.toLowerCase().split(" ")[0]?.trim()

    if(cleanHttp === cleanNmap)return true

    if(cleanNmap && cleanHttp?.includes(cleanNmap)||cleanHttp && cleanNmap?.includes(cleanHttp))return true

      return false
}
