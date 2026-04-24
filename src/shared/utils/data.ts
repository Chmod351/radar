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



