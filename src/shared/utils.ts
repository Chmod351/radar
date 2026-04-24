import { logger } from "./errorLogger";
import type { AnalyzedTarget } from "./types";


// bun ya maneja user agents, toca migrar esto al binario de bun
export const USER_AGENTS :string[]= [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

export const chromeHints = [
  "-H", "sec-ch-ua: \"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"142\", \"Chromium\";v=\"142\"",
  "-H", "sec-ch-ua-mobile: ?0",
  "-H", "sec-ch-ua-platform: \"Windows\"",
];

export const noise:string[]= ["UncommonHeaders", "Cookies", "HttpOnly", "Content-Language", 
  "X-Frame-Options", "X-XSS-Protection", "Strict-Transport-Security", 
  "X-Content-Type-Options", "Access-Control-Allow-Methods", 
  "Meta-Refresh-Redirect", "RedirectLocation", "PasswordField",
  "X-Powered-By"];



export const criticalKeywords:string[] = [
  "gov","gob","policia","salud","banco",
  "sistemas","system", "staging",
  "svn", "git", "api", "dev", "stg", "test", "mail",
  "vpn", "admin", "db", "ssh", "backup", "internal","checkout","payment","pago","wallet","billing","invoice","pos","crypto","exchange","trading","bank","swift",
  "auth","login","sso","oauth","token","keycloak","okta","directory","ldap","active-directory","adfs","idp","mfa","2fa","jenkins","gitlab","bitbucket","nexus","sonarqube",
  "docker","env","config","settings","secret","vault","grafana","prometheus","kibana","elastic","splunk","traefik","cpanel","plesk","whm","zabbix","nagios","uptime",
  "s3","bucket","storage","cloud","nas","files","drive","dbadmin","phpadmin","pgadmin","mongo-express","redis",
];

export const PHASES={
  ORCHESTRATOR:"ORCHESTRATOR",
  RECON:"RECON",
}as const;

export const LOGGER={
  ERROR:0,
  WARN:1,
  INFO:2,
  DEBUG:3,
}as const;


export const SENSORS = {
  INFRA_TYPE: {
    UNKNOWN: 0,
    CLOUD: 1,
    SELF_HOSTED: 2,
  },
  INFRA_STATUS: {
    ERROR: 0,
    NOT_AVAILABLE: 1,
    MANAGED: 2,
    VULNERABLE: 3,
    REVIEW_REQUIRED: 4,
    SECURE: 5,
    GENERIC:6,
  },
  PRIORITY: {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
  },
  ACTION: {
    SCAN_FAILED: 0,
    DUPLICATE: 1,
    SKIP: 2,
    READY: 3,
  },
} as const;

export const PROTOCOLS = {
  TRANSPORT:{
    TCP: 20,
    UDP:21,
    UNKNOWN:22,
  },
  APP:{
    UNKNOWN: 0,
    HTTP: 1,
    HTTPS: 2,
    SSH: 3,
    FTP: 4,
    DNS: 5,
    DATABASE: 6,
    MAIL: 7, // SMTP/IMAP
  },
} as const;

export const CDN_PROVIDERS = {
  NONE: 0,
  CLOUDFLARE: 1,
  AKAMAI: 2,
  CLOUDFRONT: 3,
  FASTLY: 4,
  INCAPSULA: 5,
  GOOGLE_CDN:6,
  GITHUB_CDN:7,
  AWS_S3:8,
  UNKNOWN_CDN: 99,
} as const;


// ----------------
export const noiseSet = new Set(noise);
export const isRealTech = (techName: string) => !noiseSet.has(techName);
export const RESULTS_BASE = process.env.RESULTS_BASE || "./results";
export const TARGET = Bun.argv[2]; // Esto reemplaza al TARGET="$1"
export const OP_DIR = `${RESULTS_BASE}/${TARGET}`;
// ----------------




export async function dataSaver(finalReport:AnalyzedTarget){
  try {
    await Bun.write(`${OP_DIR}/report.json`,JSON.stringify(finalReport,null,2));
  } catch (error:unknown){
    logger.error("FINAL-REPORT", getErrorMessage(error));
  }
}


export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}






