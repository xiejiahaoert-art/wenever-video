/**
 * Compile strictly increasing [output second, source second] anchors.
 * Times beyond the anchors hold the first or last state.
 */
export function makeTimeMap(anchors) {
  if (!Array.isArray(anchors) || anchors.length < 2) {
    throw new TypeError("Provide at least two timing anchors.");
  }
  const pairs = anchors.map((pair, index) => {
    if (!Array.isArray(pair) || pair.length !== 2 ||
        pair.some(value => !Number.isFinite(value) || value < 0)) {
      throw new TypeError("Each timing anchor must contain two nonnegative finite seconds.");
    }
    if (index && (pair[0] <= anchors[index - 1][0] || pair[1] <= anchors[index - 1][1])) {
      throw new RangeError("Both anchor columns must increase strictly.");
    }
    return [...pair];
  });

  function interpolate(time, from, to) {
    if (!Number.isFinite(time)) throw new TypeError("Pass a finite time in seconds.");
    const right = pairs.findIndex(pair => pair[from] >= time);
    if (right < 0) return pairs.at(-1)[to];
    if (right === 0) return pairs[0][to];
    const a = pairs[right - 1];
    const b = pairs[right];
    return a[to] + (b[to] - a[to]) * (time - a[from]) / (b[from] - a[from]);
  }

  return {
    sourceTimeAt: outputTime => interpolate(outputTime, 0, 1),
    outputTimeAt: sourceTime => interpolate(sourceTime, 1, 0),
  };
}
