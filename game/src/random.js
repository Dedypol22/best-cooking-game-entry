// A small seeded random number generator (mulberry32): the same seed gives the same
// kitchen, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    /** A float in [0, 1). */
    next() {
      return random();
    },
    /** An integer in [0, max). */
    nextInt(max) {
      return Math.floor(random() * max);
    },
    /** Pick one element of an array. */
    pick(list) {
      return list[Math.floor(random() * list.length)];
    },
  };
}
