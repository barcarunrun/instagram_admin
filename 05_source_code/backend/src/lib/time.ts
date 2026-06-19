export function nowIso(): string {
  return new Date().toISOString();
}

export function isFutureDate(value: string): boolean {
  return new Date(value).getTime() > Date.now();
}

export function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function addHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}