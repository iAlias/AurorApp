import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock minimo di AudioContext: jsdom non implementa la Web Audio API, quindi
// audio.ts deve funzionare (o restare silenzioso) senza di essa. Qui la
// forniamo noi per poter verificare quali nodi vengono creati.
class FakeAudioParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect = vi.fn();
}

class FakeOscillatorNode {
  type = 'sine';
  frequency = new FakeAudioParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  destination = {};
  state: 'running' | 'suspended' = 'running';
  createOscillator = vi.fn(() => new FakeOscillatorNode());
  createGain = vi.fn(() => new FakeGainNode());
  resume = vi.fn(() => Promise.resolve());

  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

function installFakeAudioContext(): void {
  (window as unknown as { AudioContext: typeof AudioContext }).AudioContext =
    FakeAudioContext as unknown as typeof AudioContext;
}

function removeFakeAudioContext(): void {
  delete (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
}

async function freshAudio() {
  return import('../../src/ui/audio');
}

beforeEach(() => {
  vi.resetModules();
  FakeAudioContext.instances = [];
});

afterEach(() => {
  removeFakeAudioContext();
});

describe('audioManager', () => {
  test('play() senza unlock() non lancia (nessun AudioContext disponibile)', async () => {
    // Nessun AudioContext installato: simula il contesto reale prima del
    // primo gesto dell'utente, o un browser senza supporto.
    const { audioManager } = await freshAudio();

    expect(() => audioManager.play('pop')).not.toThrow();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  test('play() senza unlock() non lancia anche quando AudioContext esiste globalmente', async () => {
    installFakeAudioContext();
    const { audioManager } = await freshAudio();

    expect(() => audioManager.play('party')).not.toThrow();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  test('setEnabled(false) impedisce la creazione di qualunque nodo, anche dopo unlock()', async () => {
    installFakeAudioContext();
    const { audioManager } = await freshAudio();

    audioManager.unlock();
    expect(FakeAudioContext.instances).toHaveLength(1);
    const instance = FakeAudioContext.instances[0];

    audioManager.setEnabled(false);
    audioManager.play('pop');

    expect(instance.createOscillator).not.toHaveBeenCalled();
    expect(instance.createGain).not.toHaveBeenCalled();
  });

  test('dopo unlock(), play() crea oscillatore e gain e non lancia', async () => {
    installFakeAudioContext();
    const { audioManager } = await freshAudio();

    audioManager.unlock();
    const instance = FakeAudioContext.instances[0];

    expect(() => audioManager.play('pop')).not.toThrow();
    expect(instance.createOscillator).toHaveBeenCalledTimes(1);
    expect(instance.createGain).toHaveBeenCalledTimes(1);
  });

  // Ticchettio del timer in corso (§FR-6): un pattern brevissimo pensato per
  // ripetersi ogni secondo senza infastidire — verifichiamo solo che sia
  // registrato ed esegua lo stesso percorso sicuro degli altri suoni.
  test('play("tick") dopo unlock() crea un solo oscillatore/gain e non lancia', async () => {
    installFakeAudioContext();
    const { audioManager } = await freshAudio();

    audioManager.unlock();
    const instance = FakeAudioContext.instances[0];

    expect(() => audioManager.play('tick')).not.toThrow();
    expect(instance.createOscillator).toHaveBeenCalledTimes(1);
    expect(instance.createGain).toHaveBeenCalledTimes(1);
  });
});
