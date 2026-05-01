import { execa } from "execa";

export async function getHttpHeaders(host:string):Promise<string> {
  const { stdout } = await execa("httpx-toolkit", [
    "-silent",
    "-no-color",
    "-title",
    "-web-server",
    "-status-code",
    // "-threads",
    "-json",
    // "50",
  ], { input:host, 
    timeout: 20000 });

  return stdout; 
}
