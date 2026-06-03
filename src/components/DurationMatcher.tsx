import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Play, ArrowCounterClockwise, CheckCircle } from '@phosphor-icons/react';
import * as Tone from 'tone';
import { cn } from '@/app/utils/cn';
import { Button } from '@/shared/buttons/Button';
import { toneEngine } from '@/shared/lib/toneEngine';

type DurationType = 'quarter' | 'eighth' | 'sixteenth';

interface NodeItem {
  id: string;
  type: DurationType;
  label: string;
}

const AUDIO_NODES: NodeItem[] = [
  { id: 'a1', type: 'quarter', label: 'Слушать' },
  { id: 'a2', type: 'eighth', label: 'Слушать' },
  { id: 'a3', type: 'sixteenth', label: 'Слушать' },
];

const DURATION_NODES: NodeItem[] = [
  { id: 'd1', type: 'sixteenth', label: 'Шестнадцатые' },
  { id: 'd2', type: 'quarter', label: 'Четвертные' },
  { id: 'd3', type: 'eighth', label: 'Восьмые' },
];

interface Connection {
  audioId: string;
  durationId: string;
}

export const DurationMatcher: React.FC = () => {
  const componentId = useId();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [activeDrag, setActiveDrag] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [errorLine, setErrorLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const durationRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const playbackTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isCompleted = connections.length === AUDIO_NODES.length;

  const stopAudio = useCallback(() => {
    playbackTimeouts.current.forEach(clearTimeout);
    playbackTimeouts.current = [];
    toneEngine.releaseNote('C4');
    setIsPlaying(null);
  }, []);

  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      if (e.type === 'play' && e.target instanceof HTMLAudioElement) stopAudio();
      if (e.type === 'app-media-play') {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.id !== componentId) stopAudio();
      }
    };
    document.addEventListener('play', handleGlobalPlay, true);
    document.addEventListener('app-media-play', handleGlobalPlay);

    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
      document.removeEventListener('app-media-play', handleGlobalPlay);
      stopAudio();
    };
  }, [stopAudio, componentId]);

  const handleRestart = useCallback(() => {
    setConnections([]);
    setIsPlaying(null);
    setActiveDrag(null);
    setErrorLine(null);
    stopAudio();
  }, [stopAudio]);

  const playRhythm = async (type: DurationType, id: string) => {
    if (Tone.context.state !== 'running') await Tone.start();

    document.querySelectorAll('audio').forEach((a) => a.pause());
    document.dispatchEvent(new CustomEvent('app-media-play', { detail: { id: componentId } }));

    stopAudio();
    setIsPlaying(id);

    let notes = 0;
    let interval = 0;
    switch (type) {
      case 'quarter':
        notes = 4;
        interval = 500;
        break;
      case 'eighth':
        notes = 8;
        interval = 250;
        break;
      case 'sixteenth':
        notes = 16;
        interval = 125;
        break;
    }

    for (let i = 0; i < notes; i++) {
      const t = setTimeout(() => {
        toneEngine.playNote('C4');
        const relT = setTimeout(() => toneEngine.releaseNote('C4'), Math.min(100, interval - 20));
        playbackTimeouts.current.push(relT);
      }, i * interval);
      playbackTimeouts.current.push(t);
    }

    const timeout = setTimeout(() => setIsPlaying(null), notes * interval);
    playbackTimeouts.current.push(timeout);
  };

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setIsMobile(window.innerWidth < 768);

    const newLines = connections
      .map((conn) => {
        const startEl = audioRefs.current[conn.audioId];
        const endEl = durationRefs.current[conn.durationId];
        if (!startEl || !endEl) return null;

        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();

        const x1 =
          window.innerWidth < 768
            ? startRect.left + startRect.width / 2 - containerRect.left
            : startRect.right - containerRect.left;
        const y1 =
          window.innerWidth < 768
            ? startRect.bottom - containerRect.top
            : startRect.top + startRect.height / 2 - containerRect.top;

        const x2 =
          window.innerWidth < 768
            ? endRect.left + endRect.width / 2 - containerRect.left
            : endRect.left - containerRect.left;
        const y2 =
          window.innerWidth < 768
            ? endRect.top - containerRect.top
            : endRect.top + endRect.height / 2 - containerRect.top;

        return { x1, y1, x2, y2 };
      })
      .filter(Boolean) as typeof lines;

    setLines(newLines);
  }, [connections]);

  useEffect(() => {
    updateLines();
    const observer = new ResizeObserver(updateLines);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateLines]);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    group: 'audio' | 'duration',
  ) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();

    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const elRect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    const startX = elRect.left + elRect.width / 2 - containerRect.left;
    const startY = elRect.top + elRect.height / 2 - containerRect.top;

    setActiveDrag({ startX, startY, currentX: startX, currentY: startY });
    const startId = id;
    const startGroup = group;

    const handlePointerMove = (moveEv: PointerEvent) => {
      setActiveDrag((prev) =>
        prev
          ? {
              ...prev,
              currentX: moveEv.clientX - containerRect.left,
              currentY: moveEv.clientY - containerRect.top,
            }
          : null,
      );
    };

    const handlePointerUp = (upEv: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      const dropEl = document.elementFromPoint(upEv.clientX, upEv.clientY);
      const targetNode = dropEl?.closest('[data-node-id]');

      if (targetNode) {
        const targetId = targetNode.getAttribute('data-node-id')!;
        const targetGroup = targetNode.getAttribute('data-node-group')!;

        if (targetGroup !== startGroup) {
          const audioId = startGroup === 'audio' ? startId : targetId;
          const durationId = startGroup === 'duration' ? startId : targetId;

          const audioType = AUDIO_NODES.find((n) => n.id === audioId)?.type;
          const durationType = DURATION_NODES.find((n) => n.id === durationId)?.type;

          if (audioType && durationType && audioType === durationType) {
            setConnections((prev) => {
              if (prev.some((c) => c.audioId === audioId || c.durationId === durationId))
                return prev;
              return [...prev, { audioId, durationId }];
            });
          } else {
            const targetRect = targetNode.getBoundingClientRect();

            const endX = isMobile
              ? targetRect.left + targetRect.width / 2 - containerRect.left
              : targetGroup === 'audio'
                ? targetRect.right - containerRect.left
                : targetRect.left - containerRect.left;

            const endY = isMobile
              ? targetGroup === 'audio'
                ? targetRect.bottom - containerRect.top
                : targetRect.top - containerRect.top
              : targetRect.top + targetRect.height / 2 - containerRect.top;

            setErrorLine({ x1: startX, y1: startY, x2: endX, y2: endY });
            setTimeout(() => setErrorLine(null), 600);
          }
        }
      }
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const getCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
    if (isMobile) {
      return `M ${x1} ${y1} C ${x1} ${y1 + 60}, ${x2} ${y2 - 60}, ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-auto min-h-[300px] w-full max-w-3xl touch-none overflow-hidden rounded-2xl border-3 border-primary/20 bg-surface p-6 pb-8 shadow-lg md:min-h-[200px] md:p-10 md:pb-10"
    >
      {/* Слой отрисовки SVG Линий */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
        {lines.map((line, i) => (
          <path
            key={i}
            d={getCurvePath(line.x1, line.y1, line.x2, line.y2)}
            stroke="var(--color-access)"
            strokeWidth="4"
            fill="transparent"
            strokeLinecap="round"
          />
        ))}

        {activeDrag && (
          <path
            d={getCurvePath(
              activeDrag.startX,
              activeDrag.startY,
              activeDrag.currentX,
              activeDrag.currentY,
            )}
            stroke="var(--color-accent)"
            strokeWidth="4"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray="8 8"
            className="animate-pulse"
          />
        )}

        {errorLine && (
          <path
            d={getCurvePath(errorLine.x1, errorLine.y1, errorLine.x2, errorLine.y2)}
            stroke="var(--color-primary)"
            strokeWidth="4"
            fill="transparent"
            strokeLinecap="round"
            className="opacity-0 transition-opacity duration-500"
            style={{ animation: 'fadeOut 0.6s ease-out forwards' }}
          />
        )}
      </svg>

      <div className="relative z-20 flex h-full flex-col justify-between gap-20 md:flex-row md:gap-0">
        {/* Верхняя/Левая колонка: Аудио кнопки */}
        <div className="flex w-full flex-row justify-around gap-2 md:w-auto md:flex-col md:justify-center md:gap-6">
          {AUDIO_NODES.map((node) => {
            const isConnected = connections.some((c) => c.audioId === node.id);
            const isThisPlaying = isPlaying === node.id;

            return (
              <div
                key={node.id}
                ref={(el) => {
                  audioRefs.current[node.id] = el;
                }}
                data-node-id={node.id}
                data-node-group="audio"
                className="relative flex w-auto items-center justify-center md:w-48"
              >
                <Button
                  variant={isConnected ? 'solid' : 'outline'}
                  color={isConnected ? 'access' : 'primary'}
                  size="md"
                  disabled={isConnected}
                  onClick={() => playRhythm(node.type, node.id)}
                  className={cn(
                    'h-16 w-16 gap-3 rounded-full !p-0 md:h-auto md:w-full md:justify-start md:rounded-[16px] md:!px-10 md:!py-3.5',
                    isConnected && 'opacity-80',
                  )}
                >
                  {isConnected ? (
                    <CheckCircle weight="bold" size={32} className="md:h-6 md:w-6" />
                  ) : (
                    <Play
                      weight={isThisPlaying ? 'fill' : 'regular'}
                      size={32}
                      className={cn('md:h-6 md:w-6', isThisPlaying && 'animate-pulse')}
                    />
                  )}
                  <span className="hidden md:inline">{node.label}</span>
                </Button>

                {!isConnected && (
                  <div
                    className="absolute -bottom-5 left-1/2 flex h-8 w-8 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-accent bg-surface transition-transform hover:scale-110 active:cursor-grabbing md:top-1/2 md:-right-4 md:bottom-auto md:left-auto md:h-6 md:w-6 md:translate-x-0 md:-translate-y-1/2"
                    onPointerDown={(e) => handlePointerDown(e, node.id, 'audio')}
                  >
                    <div className="pointer-events-none h-2 w-2 rounded-full bg-accent md:h-1.5 md:w-1.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Длительности (Статические прямоугольники) */}
        <div className="mt-6 flex h-auto w-full flex-row items-start justify-between gap-2 md:mt-0 md:w-auto md:flex-col md:items-center md:justify-center md:gap-6">
          {DURATION_NODES.map((node, idx) => {
            const isConnected = connections.some((c) => c.durationId === node.id);
            const mobileStaggerClass = idx === 1 ? 'mt-16 md:mt-0' : 'mt-0';

            return (
              <div
                key={node.id}
                ref={(el) => {
                  durationRefs.current[node.id] = el;
                }}
                data-node-id={node.id}
                data-node-group="duration"
                className={cn('relative flex w-[30%] md:w-48', mobileStaggerClass)}
              >
                {!isConnected && (
                  <div
                    className="absolute -top-5 left-1/2 flex h-8 w-8 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-accent bg-surface transition-transform hover:scale-110 active:cursor-grabbing md:top-1/2 md:right-auto md:bottom-auto md:-left-4 md:h-6 md:w-6 md:translate-x-0 md:-translate-y-1/2"
                    onPointerDown={(e) => handlePointerDown(e, node.id, 'duration')}
                  >
                    <div className="pointer-events-none h-2 w-2 rounded-full bg-accent md:h-1.5 md:w-1.5" />
                  </div>
                )}

                <div
                  className={cn(
                    'flex w-full items-center justify-center text-center font-normal transition-all duration-300 select-none',
                    'h-10 rounded-[12px] border-2 px-1 text-[10px]',
                    'md:h-[54px] md:rounded-[16px] md:border-[3px] md:px-10 md:text-base',
                    isConnected
                      ? 'border-access bg-access text-white opacity-80'
                      : 'border-accent bg-surface text-white',
                  )}
                >
                  {node.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isCompleted && (
        <div className="animate-in fade-in absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/85 backdrop-blur-lg duration-500">
          <div className="flex flex-col items-center gap-4 px-4 text-center text-access">
            <CheckCircle size={64} weight="fill" className="text-access" />
            <h3 className="text-2xl font-bold text-text">Отлично! Все совпало.</h3>
            <Button
              variant="outline"
              color="primary"
              size="md"
              className="mt-4 gap-2"
              onClick={handleRestart}
            >
              <ArrowCounterClockwise size={20} />
              Начать заново
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
