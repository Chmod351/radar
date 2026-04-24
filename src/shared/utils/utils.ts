import { logger } from "../systemLogger";
import type { AnalyzedTarget } from "../types";
import { noise } from "./data";


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





