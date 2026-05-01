import type { Technology } from "../../domain/entities/types";
import { noise } from "../../shared/utils/data";

export const realTechFilter = (t: Technology) => {
 
  return !noise.some(n => t.name.includes(n));
};


export const infraTranslatorForDashboard=(infraStatus:number)=>{
  const status=["ERR","N/A","MANG","VULN","REV-REQ","SEC","GEN"];

  return status[infraStatus];
};

export const cdnTranslatorForDashboard=(value:number)=>{
  const cdnProvider=["NN","C-FLARE","AKAMAI","C-FRONT","FASTLY","INCAP","G-CDN","GITHUB_CDN","AWS_S3", "UNKNOWN_CDN"];
  return cdnProvider[value];
};
