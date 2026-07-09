import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { GAME_COLORS } from '../../core/games/colorRound';
import { Button } from '../../ui/Button';
import { GameShell } from './GameShell';

/** Sottoinsieme di `GAME_COLORS` usato come tavolozza (§Task 6): stesse 6
 * tinte richieste dal brief, riprese pari pari da "Tocca il colore" invece
 * di duplicare gli esadecimali. */
const PALETTE_IDS = ['rosso', 'blu', 'giallo', 'verde', 'viola', 'marrone'];
const PALETTE = GAME_COLORS.filter((c) => PALETTE_IDS.includes(c.id));

const STROKE_WIDTH = 10;
const ERASER_WIDTH = STROKE_WIDTH * 3;
const ERASER_ID = 'gomma';

type Point = { x: number; y: number };

/**
 * Gioco libero "Disegna col dito" (Task 6, ultimo dei 10): nessun round, nessuna
 * stella, nessuna schermata finale — `totalRounds={0}` sul `GameShell` basta a
 * disattivarle (vedi il commento su `showFinal` in GameShell.tsx). Il bambino
 * disegna a mano libera su un canvas a tutta larghezza finché non preme
 * "Ricomincia" o torna alla griglia.
 */
export function DisegnaColDito() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [selectedId, setSelectedId] = useState<string>(PALETTE[0].id);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Dimensiona il buffer del canvas a `cssSize * devicePixelRatio` e scala il
  // contesto di conseguenza: senza questo il tratto risulta sgranato sui
  // device ad alta densità (retina/mobile). Il listener di resize richiama la
  // stessa funzione: NON si prova a ridisegnare il contenuto precedente sul
  // nuovo buffer, quindi ridimensionare la finestra pulisce il disegno — una
  // perdita accettata per la semplicità del gioco (documentata anche nel
  // brief del task), non un bug.
  useEffect(() => {
    function resizeCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  function pointFromEvent(e: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const point = pointFromEvent(e);
    const isEraser = selectedIdRef.current === ERASER_ID;
    const color = PALETTE.find((c) => c.id === selectedIdRef.current);

    ctx.strokeStyle = isEraser ? '#FFFFFF' : color?.hex ?? '#000000';
    ctx.lineWidth = isEraser ? ERASER_WIDTH : STROKE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handleRestart() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // clearRect lavora in coordinate CSS grazie allo scale impostato in
    // resizeCanvas, quindi basta la dimensione "logica" del canvas.
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  return (
    <GameShell
      title="Disegna col dito"
      emoji="🎨"
      totalRounds={0}
      completedRounds={0}
      finished={false}
      onRestart={handleRestart}
    >
      <div className="flex flex-col gap-4">
        <canvas
          ref={canvasRef}
          data-testid="drawing-canvas"
          className="w-full rounded-2xl bg-white shadow-soft"
          style={{ height: '60vh', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        <div className="flex flex-wrap items-center justify-center gap-3">
          {PALETTE.map((color) => (
            <button
              key={color.id}
              type="button"
              aria-label={color.label}
              aria-pressed={selectedId === color.id}
              onClick={() => setSelectedId(color.id)}
              className={`h-16 w-16 min-h-16 min-w-16 rounded-full shadow-soft transition-transform active:scale-[.97] ${
                selectedId === color.id ? 'ring-4 ring-deep ring-offset-2' : ''
              }`}
              style={{ backgroundColor: color.hex }}
            />
          ))}

          <button
            type="button"
            aria-label="Gomma"
            aria-pressed={selectedId === ERASER_ID}
            onClick={() => setSelectedId(ERASER_ID)}
            className={`flex h-16 w-16 min-h-16 min-w-16 items-center justify-center rounded-full border-2 border-stone bg-white text-xl shadow-soft transition-transform active:scale-[.97] ${
              selectedId === ERASER_ID ? 'ring-4 ring-deep ring-offset-2' : ''
            }`}
          >
            <span aria-hidden="true">⚪</span>
          </button>
        </div>

        <Button type="button" size="lg" className="mx-auto" onClick={handleRestart}>
          Ricomincia 🧽
        </Button>
      </div>
    </GameShell>
  );
}
