import { randomUUID } from "node:crypto";

export function createId(_prefix: string): string {
  return randomUUID();
}
