let sequence = 1000;

export function createId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}