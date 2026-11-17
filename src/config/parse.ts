export function parsePositiveInt(name: string, value: string): number {
  const number = Number(value);
  // Digits only: Number() alone would also accept "1e3", "0x10" and " 5 ".
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer, got "${value}"`);
  }
  return number;
}
