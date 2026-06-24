/** Minimum kWh billed for very short sessions (mis-clicks). */
export const MIN_ENERGY_KWH = 0.001;

const DEFAULT_POWER_KW = 7;

export function parsePowerKw(value: string | null | undefined): number {
  const parsed = value ? parseFloat(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_POWER_KW;
}

/** energyKwh = powerKw × hours elapsed between session start and end. */
export function computeAutoEnergyKwh(
  startedAt: Date | null,
  endedAt: Date,
  powerKw: number
): number {
  if (!startedAt) {
    return MIN_ENERGY_KWH;
  }
  const ms = Math.max(0, endedAt.getTime() - startedAt.getTime());
  const hours = ms / (1000 * 60 * 60);
  const raw = powerKw * hours;
  return Math.max(raw, MIN_ENERGY_KWH);
}

export function computeCost(energyKwh: number, pricePerKwh: number): number {
  return parseFloat((energyKwh * pricePerKwh).toFixed(2));
}

/** Legacy rows: completed before billing fields existed. */
export function effectiveBillingStatus(
  status: string | null,
  billingStatus: string | null,
  energyKwh: string | null
): string | null {
  if (billingStatus) return billingStatus;
  if (status === "completed" && energyKwh) return "finalized";
  return billingStatus;
}
