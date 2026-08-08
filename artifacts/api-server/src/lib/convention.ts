const PRICE_CHANGE_AT = process.env.STUDENT_CONVENTION_PRICE_CHANGE_AT || "2026-08-09T00:00:00+01:00";

export function getConventionPricing(now = new Date()) {
  const effectiveAt = new Date(PRICE_CHANGE_AT);
  const studentPrice = now.getTime() >= effectiveAt.getTime() ? 20000 : 15000;
  return {
    student: studentPrice,
    graduate: 30000,
    chapter: 50000,
    student_price_change_at: effectiveAt.toISOString(),
  };
}