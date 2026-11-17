export function gridForBounds(bounds) {
  const extent = bounds.isEmpty() ? 0 : Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z));
  const size = Math.max(12, Math.ceil(extent + 1) * 2);
  // Keep 100 mm spacing normally; cap line count for very large scenes.
  const step = 0.1 * 10 ** Math.max(0, Math.ceil(Math.log10(size / 100)));
  const divisions = Math.ceil(size / step / 2) * 2;
  return { size: divisions * step, divisions };
}
