/**
 * Audio Utility
 *
 * Generates sound effects via Web Audio API.
 * No audio files needed — replace with real sounds later
 * by swapping these functions.
 *
 * All sounds are short, gentle, and child-friendly.
 * The AudioContext is created lazily on first user interaction
 * (required by browser autoplay policies).
 */

let ctx = null;

function getContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, duration, type = 'sine', volume = 0.25) {
  try {
    const c = getContext();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch (_) {
    // Silently fail — audio is non-essential
  }
}

export const Audio = {
  /** Soft click for UI buttons */
  click() {
    tone(800, 0.05, 'sine', 0.1);
  },

  /** Pop sound when picking up an item */
  pop() {
    tone(660, 0.1, 'sine', 0.2);
  },

  /** Nom-nom for the monster eating */
  munch() {
    tone(200, 0.1, 'square', 0.12);
    setTimeout(() => tone(260, 0.1, 'square', 0.12), 80);
  },

  /** Short success jingle (3 rising notes) */
  success() {
    tone(523, 0.12);
    setTimeout(() => tone(659, 0.12), 100);
    setTimeout(() => tone(784, 0.25), 200);
  },

  /** Full celebration fanfare */
  celebrate() {
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.12, 'sine', 0.18), i * 70);
    });
  },

  /** Gentle descending tone for "oops" moments */
  gentle() {
    tone(440, 0.2, 'sine', 0.12);
    setTimeout(() => tone(349, 0.3, 'sine', 0.12), 180);
  }
};
