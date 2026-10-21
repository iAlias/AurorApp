import { TextToSpeech } from '@capacitor-community/text-to-speech';

/**
 * Legge ad alta voce una consegna: i bimbi di 2-5 anni non sanno ancora
 * leggere. Voce del dispositivo in italiano, nessuna rete: sul web
 * `speechSynthesis`, nell'app Android il motore di sintesi vocale di sistema.
 * Come per `audio.ts` (E13), un fallimento non deve mai essere visibile:
 * senza sintesi vocale disponibile l'app resta semplicemente in silenzio.
 */
export function speak(text: string): void {
  try {
    // Minuscolo: alcuni motori leggono le parole MAIUSCOLE lettera per lettera.
    TextToSpeech.speak({ text: text.toLowerCase(), lang: 'it-IT', rate: 0.9 }).catch(() => {});
  } catch {
    // nessuna sintesi vocale
  }
}

export function stopSpeaking(): void {
  try {
    TextToSpeech.stop().catch(() => {});
  } catch {
    // nessuna sintesi vocale
  }
}
