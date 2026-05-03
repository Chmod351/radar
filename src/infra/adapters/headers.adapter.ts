import { execa } from "execa";
import { getRandomAgent } from "../../shared/utils/utils";

export async function  fetchTargetWithTimeout (url:string) {

  const agent = getRandomAgent();

  const controller = new AbortController();

  const id = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": agent } as Record<string, string>,
      redirect: "follow",
      signal: controller.signal,
    });

    return response;
  } catch (e:unknown){
    throw (e);
  } finally {
    clearTimeout(id);
  }
    
}


export async function fetchFallback (url:string) {
  const agent = getRandomAgent() ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0";
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
    return stdout; 
  } catch (e) {
  /* handle error */
    throw (e);
  }
 
}
