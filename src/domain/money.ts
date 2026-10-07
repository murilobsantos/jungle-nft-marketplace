const UNIT = 10n ** 18n;
export function wei(value: string): bigint {
  const [whole, fractional = ""] = value.split(".");
  return (
    BigInt(whole || "0") * UNIT +
    BigInt(fractional.padEnd(18, "0").slice(0, 18))
  );
}
export function eth(value: bigint): string {
  const whole = value / UNIT;
  const fraction = (value % UNIT)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}
export function multiply(price: string, quantity: number): string {
  return eth(wei(price) * BigInt(quantity));
}
export function displayEth(value: string): string {
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}
