// Sintesi WebAudio per i suoni dell'app (nessun asset mp3): oscillatori sine
// con inviluppo (attack/decay) per pattern brevi e dolci (xilofono/campanella).
export type SoundName = 'pop' | 'arc' | 'almost' | 'party' | 'done-day' | 'badge' | 'tick';

interface Note {
  freq: number;
  startSec: number;
  durSec: number;
}

// Frequenze da scala pentatonica maggiore (do re mi sol la) — sempre
// consonanti tra loro, mai stridenti, adatte a un'orecchia di 3 anni.
const PATTERNS: Record<SoundName, Note[]> = {
  pop: [{ freq: 880, startSec: 0, durSec: 0.08 }],
  // Ticchettio del timer in corso: piu' breve e neutro di 'pop' (che segna
  // un evento), pensato per ripetersi ogni secondo senza risultare invadente.
  tick: [{ freq: 1200, startSec: 0, durSec: 0.03 }],
  arc: [
    { freq: 659.25, startSec: 0, durSec: 0.12 },
    { freq: 880, startSec: 0.1, durSec: 0.16 },
  ],
  almost: [
    { freq: 587.33, startSec: 0, durSec: 0.12 },
    { freq: 659.25, startSec: 0.12, durSec: 0.12 },
    { freq: 783.99, startSec: 0.24, durSec: 0.18 },
  ],
  party: [
    { freq: 523.25, startSec: 0, durSec: 0.16 },
    { freq: 659.25, startSec: 0.14, durSec: 0.16 },
    { freq: 783.99, startSec: 0.28, durSec: 0.16 },
    { freq: 1046.5, startSec: 0.42, durSec: 0.2 },
    { freq: 783.99, startSec: 0.62, durSec: 0.16 },
    { freq: 1046.5, startSec: 0.78, durSec: 0.32 },
  ],
  'done-day': [
    { freq: 783.99, startSec: 0, durSec: 0.14 },
    { freq: 1046.5, startSec: 0.12, durSec: 0.22 },
  ],
  badge: [
    { freq: 659.25, startSec: 0, durSec: 0.12 },
    { freq: 783.99, startSec: 0.11, durSec: 0.12 },
    { freq: 1046.5, startSec: 0.22, durSec: 0.24 },
  ],
};

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | undefined {
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.8;

function playNote(context: AudioContext, note: Note, atTime: number): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(note.freq, atTime);

  const peak = Math.max(volume * 0.35, 0.0001);
  gain.gain.setValueAtTime(0.0001, atTime);
  gain.gain.exponentialRampToValueAtTime(peak, atTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, atTime + note.durSec);

  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(atTime);
  osc.stop(atTime + note.durSec + 0.03);
}

export const audioManager = {
  /**
   * Da chiamare dentro un gesture handler (es. tap su "Si mangia!"): iOS
   * blocca la creazione/ripresa dell'AudioContext fuori da un gesto utente
   * (§8.3). Idempotente: non ricrea il contesto se gia' presente.
   */
  unlock(): void {
    try {
      if (!ctx) {
        const Ctor = resolveAudioContextCtor();
        if (!Ctor) return;
        ctx = new Ctor();
      }
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
    } catch {
      ctx = null;
    }
  },

  setEnabled(on: boolean): void {
    enabled = on;
  },

  setVolume(v: number): void {
    volume = Math.min(1, Math.max(0, v));
  },

  /**
   * Silenzioso (nessun nodo creato, nessun errore) se disabilitato o se
   * l'AudioContext non e' ancora stato sbloccato/disponibile. Try/catch
   * totale: un fallimento audio non deve mai essere visibile (E13).
   */
  play(name: SoundName): void {
    if (!enabled || !ctx) return;
    const audioCtx = ctx;
    try {
      const notes = PATTERNS[name];
      const now = audioCtx.currentTime;
      for (const note of notes) {
        playNote(audioCtx, note, now + note.startSec);
      }
    } catch {
      // E13: AudioContext puo' fallire in modi imprevedibili (iOS) — l'app
      // resta silenziosa, mai errori visibili all'utente.
    }
  },

  /** Una nota singola (lo xilofono dei giochi), con le stesse garanzie di `play`. */
  tone(freq: number, durSec = 0.6): void {
    if (!enabled || !ctx) return;
    try {
      playNote(ctx, { freq, startSec: 0, durSec }, ctx.currentTime);
    } catch {
      // E13: silenzio, mai errori visibili.
    }
  },
};
