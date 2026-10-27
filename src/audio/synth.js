// synth.js - tiny building blocks shared by music.js, ambience.js and sfx.js.
// (Extra file, not in the original tree: it keeps the three audio files short and gentle.)
//
// The rule for everything here: no sharp edges. Every sound fades in (at least a few
// milliseconds) and fades out, and is rounded off by a low-pass filter.

const NOISE_MAKEUP = 3.5;

export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);

// One soft note. opts: freq, start (seconds, audio clock), dur, type, gain, attack, cutoff, detune, glideTo, extra (more nodes to feed)
export function note(ctx, dest, opts) {
  const { freq, start = ctx.currentTime, dur = 1, type = "sine", gain = 0.1, attack = 0.02, cutoff = 4000, detune = 0, glideTo = null, extra = [] } = opts;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur * 0.8);
  osc.detune.value = detune;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = cutoff;

  osc.connect(lp); lp.connect(env); env.connect(dest);
  for (const node of extra) env.connect(node); // e.g. a send to an echo. It gets the enveloped sound, never the raw tone
  osc.start(start);
  osc.stop(start + dur + 0.05);
  return osc;
}

// A short puff of filtered noise (footsteps, crackles, paper)
export function puff(ctx, dest, buf, opts) {
  const { start = ctx.currentTime, dur = 0.1, gain = 0.1, type = "bandpass", freq = 1500, q = 0.8, attack = 0.006 } = opts;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const offset = Math.random() * Math.max(0, buf.duration - dur - 0.1);

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;

  const env = ctx.createGain();
  // Filtered noise is much quieter than a tone of the same `gain` (a band-pass throws most of it away),
  // so puffs are scaled up to sit at the same loudness as notes. Measured with Sound.meter().
  const level = gain * NOISE_MAKEUP;
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(level, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  src.connect(filter); filter.connect(env); env.connect(dest);
  src.start(start, offset, dur + 0.05);
  return src;
}
