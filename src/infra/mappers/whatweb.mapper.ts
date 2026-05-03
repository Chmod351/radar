import type { Technology } from "../../domain/entities/types";
import type { WhatWebRawResponse } from "../../phases/03-http/client";

const  noise = [
  "IP", "HTTPServer", "Country", "Date", "BaseID",
  "Title", "HTML5", "Script", "X-UA-Compatible", "Email",
];


export function whatwebParser(rawContent:string) {
  if (!rawContent || rawContent.trim() === "" || !rawContent.includes("[")) return [];

  const jsonStart = rawContent.indexOf("[");
  const jsonEnd = rawContent.lastIndexOf("]"); 
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) return []; 
  const cleanJson = rawContent.substring(jsonStart, jsonEnd + 1); 

  const parsed = JSON.parse(cleanJson);

  if (!Array.isArray(parsed) || parsed.length === 0) return []; 
  const lastResult=parsed[parsed.length -1];
  const rawPlugins = (lastResult.plugins || {}) as WhatWebRawResponse;
  return parsePlugins(rawPlugins);
}



function parsePlugins(plugins:WhatWebRawResponse) {
  return Object.entries(plugins)
    .filter(([name]) => !noise.includes(name))
    .map(([name, details]): Technology => {
      const version = 
          details.version?.[0] || 
          details.string?.[0] || 
          details.module?.[0] || 
          "unknown";

      return {
        name,
        version,
      };
    })
    .filter(t => 
      t.version !== "unknown" || 
        ["Nginx", "Apache", "PHP", "WordPress", "Docker", "Cloudflare", "Laravel"].includes(t.name),
    );
}
