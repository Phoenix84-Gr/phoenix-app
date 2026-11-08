/** The elliptical arc menu.
 *  Items sit on a ring seen slightly from above: the front one big and bright, the rest curving away
 *  to the left and right (smaller, dimmer, softer) and rising toward the back of the ring. */

/** The shortest signed distance from `pos` to item `i` on a ring of `n` (so the ring wraps). */
export function ringOffset(i: number, pos: number, n: number): number {
  let d = (i - pos) % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

export function arcLayout(i: number, pos: number, n: number, rx: number, ry: number) {
  const theta = (ringOffset(i, pos, n) / n) * Math.PI * 2;
  const front = (Math.cos(theta) + 1) / 2;                    // 1 at the front, 0 at the back
  return {
    x: rx * Math.sin(theta),
    y: -ry * (1 - Math.cos(theta)),                           // the back of the ring sits higher
    scale: 0.5 + 0.5 * front,
    opacity: 0.18 + 0.82 * Math.pow(front, 1.6),
    blur: (1 - front) * 3,
    z: Math.round(front * 100),
  };
}

/** Where a flick is heading (exponential decay, rate 0.998, as in Apple's "Designing Fluid Interfaces"),
 *  in the same units as the velocity's distance per second. */
export function project(velocity: number, rate = 0.998): number {
  return ((velocity / 1000) * rate) / (1 - rate);
}
