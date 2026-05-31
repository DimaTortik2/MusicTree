import type { NoteInfo } from "@/features/vocalTuner/types";

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNoteInfo(freq: number | null): NoteInfo | null {
  // ЛИМИТЫ (Правило из ТЗ): 65 Hz (C2) - 1046 Hz (C6)
  if (!freq || freq < 65 || freq > 1046) return null;
  const n = 12 * Math.log2(freq / 440) + 69;
  const i = Math.round(n);
  const cents = Math.round((n - i) * 100);
  return {
    name: NOTES[((i % 12) + 12) % 12],
    octave: Math.floor(i / 12) - 1,
    freq: Math.round(freq),
    cents,
  };
}

export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const n = buffer.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / n);

  // ПОРОГ ТИШИНЫ: 0.00316 ~ это примерно -50dB. Игнорируем дыхание и кулер.
  if (rms < 0.00316) return null;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += buffer[i];
  mean /= n;
  for (let i = 0; i < n; i++) buffer[i] -= mean;

  // ЛИМИТЫ
  const minFreq = 65,
    maxFreq = 1046;
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);
  if (maxLag > n / 2) return null;

  const acf = new Float32Array(maxLag + 1);
  let maxAcf = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let num = 0,
      d1 = 0,
      d2 = 0;
    for (let i = 0; i < n - lag; i++) {
      num += buffer[i] * buffer[i + lag];
      d1 += buffer[i] * buffer[i];
      d2 += buffer[i + lag] * buffer[i + lag];
    }
    const denom = Math.sqrt(d1 * d2);
    acf[lag] = denom > 0.0001 ? num / denom : 0;
    if (acf[lag] > maxAcf) maxAcf = acf[lag];
  }

  if (maxAcf < 0.3) return null;

  let peakLag = minLag;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (acf[lag] > acf[lag - 1] && acf[lag] >= acf[lag + 1] && acf[lag] > acf[peakLag]) {
      peakLag = lag;
    }
  }

  let refinedLag = peakLag;
  if (peakLag > minLag && peakLag < maxLag) {
    const y0 = acf[peakLag - 1],
      y1 = acf[peakLag],
      y2 = acf[peakLag + 1];
    const denom = 2 * (2 * y1 - y0 - y2);
    if (Math.abs(denom) > 0.0001) {
      const delta = (y2 - y0) / denom;
      if (Math.abs(delta) <= 0.5) refinedLag = peakLag + delta;
    }
  }

  const freq = sampleRate / refinedLag;
  return freq >= minFreq && freq <= maxFreq ? freq : null;
}
