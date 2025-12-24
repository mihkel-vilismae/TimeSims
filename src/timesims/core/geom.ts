// Geometry utilities for TimeSims core.  These functions operate purely
// on 2D positions on the XZ plane.  Vec2 is defined here to avoid
// coupling to the 3D vector types used elsewhere in the project.

export type Vec2 = { x: number; z: number };

/**
 * Compute the squared Euclidean distance between two 2D points.
 */
export function distSq(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return dx * dx + dz * dz;
}

/**
 * Compute the Euclidean distance between two 2D points.
 */
export function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt(distSq(a, b));
}

/**
 * Test whether a line segment from p0 to p1 intersects a circle with
 * centre `c` and radius `r`.  The check uses a projection of the circle
 * centre onto the segment and measures the perpendicular distance.
 */
export function lineSegmentIntersectsCircle(
  p0: Vec2,
  p1: Vec2,
  c: Vec2,
  r: number
): boolean {
  // Vector from p0 to p1.
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  // Early out if segment is degenerate.
  const segLenSq = dx * dx + dz * dz;
  if (segLenSq === 0) {
    return distSq(p0, c) <= r * r;
  }
  // Projection parameter t of centre c onto segment p0->p1.
  const t = ((c.x - p0.x) * dx + (c.z - p0.z) * dz) / segLenSq;
  // Clamp t to [0,1] to stay within segment.
  const clamped = Math.max(0, Math.min(1, t));
  // Closest point on segment to c.
  const closest: Vec2 = { x: p0.x + clamped * dx, z: p0.z + clamped * dz };
  // Distance from closest point to centre.
  return distSq(closest, c) <= r * r;
}