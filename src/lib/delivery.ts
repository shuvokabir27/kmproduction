export interface DeliverySettings {
  base_weight_grams: number;
  base_charge: number;
  extra_charge_per_kg: number;
  free_delivery_threshold: number;
  free_delivery_enabled: boolean;
}

export const DEFAULT_DELIVERY: DeliverySettings = {
  base_weight_grams: 1000,
  base_charge: 120,
  extra_charge_per_kg: 20,
  free_delivery_threshold: 2000,
  free_delivery_enabled: true,
};

export interface DeliveryResult {
  charge: number;
  isFree: boolean;
  amountToFree: number; // remaining money to qualify for free delivery (0 if already free or feature off)
  totalWeightGrams: number;
}

export function calculateDelivery(
  subtotal: number,
  totalWeightGrams: number,
  s: DeliverySettings
): DeliveryResult {
  const weight = Math.max(0, totalWeightGrams);

  if (s.free_delivery_enabled && subtotal >= s.free_delivery_threshold && subtotal > 0) {
    return { charge: 0, isFree: true, amountToFree: 0, totalWeightGrams: weight };
  }

  // Base charge applies up to base_weight_grams (e.g., 1000g)
  let charge = s.base_charge;
  if (weight > s.base_weight_grams) {
    const extraGrams = weight - s.base_weight_grams;
    const extraKgs = Math.ceil(extraGrams / 1000); // round up to whole kg
    charge += extraKgs * s.extra_charge_per_kg;
  }

  const amountToFree = s.free_delivery_enabled
    ? Math.max(0, s.free_delivery_threshold - subtotal)
    : 0;

  return { charge, isFree: false, amountToFree, totalWeightGrams: weight };
}
