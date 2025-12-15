export function calcEma(values: number[], length: number): number | null {
  if (!values.length) return null;
  const alpha = 2 / (length + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i += 1) {
    ema = values[i] * alpha + ema * (1 - alpha);
  }
  return ema;
}

export function calcDemandShift(values: number[], shortPeriod = 5, longPeriod = 20): number {
  const shortEma = calcEma(values, shortPeriod);
  const longEma = calcEma(values, longPeriod);
  if (shortEma === null || longEma === null || longEma === 0) {
    return 0;
  }
  return Math.round(((shortEma - longEma) / longEma) * 100);
}
