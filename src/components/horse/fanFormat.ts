export function formatFanCount(fanCount: number): string {
  if (fanCount >= 1_000_000) {
    const millions = fanCount / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (fanCount >= 1_000) {
    const thousands = fanCount / 1_000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return String(fanCount);
}
