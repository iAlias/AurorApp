// Tipi condivisi dalla sezione "Giochi" (Task 2): infrastruttura pura,
// consumata da GameShell/GamesPage e dai giochi veri (Task 3-6).

/** Generatore di numeri casuali in [0,1) — sempre passato come parametro
 * esplicito, mai letto da `Math.random()` internamente (stesso vincolo del
 * planner: determinismo testabile). */
export type Rng = () => number;

/** Round a scelta multipla: `options` contiene sempre `target`, in ordine
 * mescolato, senza duplicati. */
export interface ChoiceRound<T> {
  target: T;
  options: T[];
}
