const UNDER_25_SURCHARGE_PCT = 20;
const OVER_50_DISCOUNT_PCT = 10;
const LATE_RETURN_PENALTY_MULTIPLIER = 1.5;

function calculateAge(dateOfBirth, referenceDate = new Date()) {
  const dob = new Date(dateOfBirth);
  const ref = new Date(referenceDate);
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age -= 1;
  return age;
}

function calculateRentalCost({ dailyRate, days, age }) {
  const baseCost = +(dailyRate * days).toFixed(2);
  let ageAdjustment = 0;
  let ageAdjustmentReason = 'Standard rate';
  if (age < 25) {
    ageAdjustment = +((baseCost * UNDER_25_SURCHARGE_PCT) / 100).toFixed(2);
    ageAdjustmentReason = `Under-25 surcharge (+${UNDER_25_SURCHARGE_PCT}%)`;
  } else if (age > 50) {
    ageAdjustment = -+((baseCost * OVER_50_DISCOUNT_PCT) / 100).toFixed(2);
    ageAdjustmentReason = `Senior discount (-${OVER_50_DISCOUNT_PCT}%)`;
  }
  const totalCost = +(baseCost + ageAdjustment).toFixed(2);
  return { baseCost, ageAdjustment, ageAdjustmentReason, totalCost };
}

function calculatePenalty({ dailyRate, expectedReturnDate, actualReturnDate }) {
  const expected = new Date(expectedReturnDate).getTime();
  const actual = new Date(actualReturnDate).getTime();
  if (actual <= expected) return 0;
  const lateMs = actual - expected;
  const lateDays = Math.ceil(lateMs / (24 * 60 * 60 * 1000));
  return +(lateDays * dailyRate * LATE_RETURN_PENALTY_MULTIPLIER).toFixed(2);
}

function diffDays(from, to) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

module.exports = {
  calculateAge,
  calculateRentalCost,
  calculatePenalty,
  diffDays,
  UNDER_25_SURCHARGE_PCT,
  OVER_50_DISCOUNT_PCT,
  LATE_RETURN_PENALTY_MULTIPLIER,
};
