export interface Technology {
  name: string;
  version: string|null;
}

export interface BypassAttempt {
  method: string ;
  header: string | null;
  status: number;
  size: number;
  timestamp: string;
}

export interface WhatWebPluginDetails {
  version: string[]|null;
  string: string[]|null;
  module: string[]|null;
  os: string[]|null; 
}

export interface OpenPort {
  port: number;
  service: string |null;
  protocol: number
  transport:number;
}
export interface WhoisIntel {
  registrar: string |null;
  creationDate: string |null;
  expirationDate: string |null;
  nameServers: string[];
  status: string[];
  emails: string |null;
  raw: string; 
}

export interface SecurityHeaders {
  hsts: boolean;
  csp: boolean;
  xfo: boolean;
  nosniff: boolean;
}

export interface HttpIntel {
  protocol: number |null;
  status: number;
  security: SecurityHeaders;
  server: string |null;
  poweredBy: string |null;
  cookies: boolean;
  attempts:BypassAttempt[];
  error?: string | null;
}

export interface Fingerprint {
server:string |null,
version:string |null,
product:string |null,
}

export interface ASNIntel extends ASNinAnalyzedTarget {
   asn_owner: string |null;
}

interface ASNinAnalyzedTarget{
  asn: string |null ;
  country: string |null; 
}

export interface ResolvedDomain {
  host: string;
  ip: string;
}
export interface WebMetadata {
  url: string;
  status_code: number;
  title: string|null;
  webserver: string |null;
  cdn: number | null;
}

export interface DnsPhase extends WebMetadata, ASNIntel,ResolvedDomain{}


export interface SearchSploitResult {
  Title: string;
  Path: string;
}

export interface SearchSploitOutput {
  Results: SearchSploitResult[] | []
}

export interface Classifier extends DnsPhase{
  priority:number,
  infra_type:number,
  action:number,
}

export interface AnalyzedTarget extends Classifier, ASNinAnalyzedTarget , WebMetadata,ResolvedDomain{
  // Datos de Red e Infraestructura
  asn_owner: string |null;
  
  // Datos de Fase 3 (Opcionales hasta que pase por la fase)
  http_intel: HttpIntel;
  http_stack: Technology[];
  open_ports:OpenPort[]

  // Datos de Fase 4
  vulnerabilities: SearchSploitResult[]
  infra_status:number|null;
  app_status:string;

  whois: WhoisIntel;
  whois_raw: string | null
}





