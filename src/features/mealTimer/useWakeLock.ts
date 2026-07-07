import { useEffect, useRef } from 'react';

export interface WakeLockState {
  supported: boolean;
}

// Interfacce minime e strutturali per la Screen Wake Lock API (non ancora
// presente in tutte le versioni di lib.dom.d.ts): stesso approccio difensivo
// di `resolveAudioContextCtor` in `ui/audio.ts`, nessun `any`.
interface WakeLockSentinelLike {
  release(): Promise<void>;
}
interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

function resolveWakeLock(): WakeLockLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { wakeLock?: WakeLockLike }).wakeLock;
}

/**
 * Wake Lock API (§8.3): mantiene lo schermo acceso mentre `active` e' vero
 * (sessione `running`), ri-acquisendo il lock quando la scheda torna
 * visibile (il sistema operativo rilascia il lock quando va in background),
 * e rilasciandolo alla pulizia (pausa/uscita/fine). Se l'API non e'
 * supportata (iOS < 16.4, alcuni browser) ritorna `{ supported: false }`: la
 * UI mostra un hint testuale invece del fallback video-loop descritto nella
 * spec completa — deviazione documentata, fuori scope per questa milestone.
 */
export function useWakeLock(active: boolean): WakeLockState {
  const supported = resolveWakeLock() !== undefined;
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!supported || !active) return undefined;
    let cancelled = false;

    async function acquire() {
      try {
        const wakeLock = resolveWakeLock();
        if (!wakeLock) return;
        const sentinel = await wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Il wake lock e' un miglioramento non critico: un rifiuto (permessi
        // negati, scheda non visibile al momento della richiesta) non deve
        // mai interrompere o rompere il timer.
      }
    }

    void acquire();

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) {
        void sentinel.release().catch(() => {});
      }
    };
  }, [active, supported]);

  return { supported };
}
