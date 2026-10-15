export type Point = { x: number; y: number };
/** Short acceleration/braking, steady walking through the middle of a road. */
export function travelProgress(t: number) {
  const edge = 0.12,
    u = Math.max(0, Math.min(1, t));
  if (u < edge) return (u * u) / (2 * edge * (1 - edge));
  if (u > 1 - edge) return 1 - (1 - u) ** 2 / (2 * edge * (1 - edge));
  return (u - edge / 2) / (1 - edge);
}
/** Catmull–Rom through road waypoints, resampled by arc length for even travel speed. */
export function pathSamples(points: Point[]): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)],
      b = points[i],
      c = points[i + 1],
      d = points[Math.min(points.length - 1, i + 2)];
    for (let j = 0; j < 24; j++) {
      const t = j / 24,
        t2 = t * t,
        t3 = t2 * t;
      const coord = (k: "x" | "y") =>
        0.5 *
        (2 * b[k] +
          (-a[k] + c[k]) * t +
          (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
          (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
      result.push({ x: coord("x"), y: coord("y") });
    }
  }
  result.push(points[points.length - 1]);
  return result;
}
export function pointOnPath(points: Point[], t: number): Point {
  if (points.length < 2) return points[0];
  const distances = points.map((p, i) =>
    i ? Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0
  );
  const total = distances.reduce((a, b) => a + b, 0);
  if (!total) return points[points.length - 1];
  let remaining = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < points.length; i++) {
    if (remaining <= distances[i] && distances[i] > 0) {
      const u = remaining / distances[i];
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * u,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * u,
      };
    }
    remaining -= distances[i];
  }
  return points[points.length - 1];
}
