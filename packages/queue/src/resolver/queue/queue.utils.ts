export function sqsName(base: string, suffix: string): string {
  return base.slice(0, 80 - suffix.length) + suffix;
}
