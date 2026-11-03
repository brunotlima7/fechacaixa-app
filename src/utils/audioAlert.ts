/**
 * Web Audio API synthesizer for the Closing Reminder ("Lembrete de Fechamento")
 * Produces a clean, pleasant, multi-tone chime without external audio assets.
 */

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not supported or blocked:', e);
    return null;
  }
};

/**
 * Plays a single synthesized tone with exponential volume decay.
 */
const playTone = (
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainLevel = 0.25
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
};

/**
 * Plays the official 4-note melodic chime for the Closing Reminder.
 * Sequence: C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz) -> C6 (1046.50 Hz)
 * Repeated smoothly twice to capture the operator's attention gently.
 */
export const playClosingReminderChime = async (): Promise<boolean> => {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const now = ctx.currentTime;

    // Phrase 1 (Bright rising chime)
    playTone(ctx, 523.25, now + 0.00, 0.45, 'sine', 0.22); // C5
    playTone(ctx, 659.25, now + 0.16, 0.45, 'sine', 0.24); // E5
    playTone(ctx, 783.99, now + 0.32, 0.55, 'sine', 0.26); // G5
    playTone(ctx, 1046.50, now + 0.48, 0.90, 'sine', 0.28); // C6
    // Harmonic shimmer
    playTone(ctx, 1318.51, now + 0.52, 0.70, 'triangle', 0.12); // E6

    // Phrase 2 (Repeat slightly higher after 1 second for reassurance)
    const phrase2 = now + 1.15;
    playTone(ctx, 587.33, phrase2 + 0.00, 0.40, 'sine', 0.22); // D5
    playTone(ctx, 659.25, phrase2 + 0.15, 0.40, 'sine', 0.24); // E5
    playTone(ctx, 783.99, phrase2 + 0.30, 0.50, 'sine', 0.26); // G5
    playTone(ctx, 1046.50, phrase2 + 0.45, 1.10, 'sine', 0.30); // C6
    playTone(ctx, 1567.98, phrase2 + 0.50, 0.90, 'triangle', 0.14); // G6

    return true;
  } catch (err) {
    console.warn('Failed to play reminder chime:', err);
    return false;
  }
};
