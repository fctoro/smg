const clampPercent = (value) => Math.max(0, Math.min(100, value));

function getReductionPercent(reductionType, customPercent) {
  switch (reductionType) {
    case "full":
      return 100;
    case "half":
      return 50;
    case "custom":
      return clampPercent(customPercent ?? 0);
    case "none":
    default:
      return 0;
  }
}

function calculateDiscountedAmount(amount, reductionType, customPercent) {
  const percent = getReductionPercent(reductionType, customPercent);
  return Math.max(0, amount * (1 - percent / 100));
}

function parseReductionFromRemark(remark) {
  const normalized = (remark || "").toUpperCase();
  const hasFull = normalized.includes("[REDUCTION:FULL]");
  const hasHalf = normalized.includes("[REDUCTION:HALF]");
  const hasCustom = normalized.includes("[REDUCTION:CUSTOM]");
  const customPercentMatch = normalized.match(/\[REDUCTION_PERCENT:(\d{1,3})\]/);

  if (hasFull) return { reductionType: "full" };
  if (hasHalf) return { reductionType: "half" };
  if (hasCustom) return { reductionType: "custom", customPercent: Number(customPercentMatch?.[1] ?? 0) };

  return { reductionType: "none" };
}

function serializeReductionMetadata(reductionType, customPercent) {
  switch (reductionType) {
    case "full":
      return "[REDUCTION:FULL]";
    case "half":
      return "[REDUCTION:HALF]";
    case "custom":
      return `[REDUCTION:CUSTOM] [REDUCTION_PERCENT:${clampPercent(customPercent ?? 0)}]`;
    case "none":
    default:
      return "";
  }
}

module.exports = {
  getReductionPercent,
  calculateDiscountedAmount,
  parseReductionFromRemark,
  serializeReductionMetadata,
};
