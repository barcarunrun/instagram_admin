import { randomUUID } from "node:crypto";

export function createId(_prefix: string): string {
  void _prefix;
  return randomUUID();
}
