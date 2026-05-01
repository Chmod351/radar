import type { WhoisIntel } from "../../domain/entities/types";
import { parseWhoisAgnostic } from "./parserWhois";

export function normalizeWhois(rawText: string): WhoisIntel {
  const data = parseWhoisAgnostic(rawText);

  const get = (k: string): string | undefined => {
    const val = data[k];
    return Array.isArray(val) ? val[0] : val;
  };

  const getAll = (k: string): string[] => {
    const val = data[k];
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  };

  return {
    registrar: get("registrar") || get("sponsoring_registrar") || null,
    creationDate: get("creation_date") || get("registered_on") || null,
    expirationDate: get("registry_expiry_date") || get("expires_on") || null,
    nameServers: [...new Set([...getAll("nserver"), ...getAll("name_server")])],
    status: [...new Set([...getAll("domain_status"), ...getAll("status")])],
    emails: get("registrant_email") || get("abuse_contact_email") || null,
    raw: rawText.slice(0, 500),
  };
}

