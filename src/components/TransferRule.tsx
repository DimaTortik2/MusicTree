import React, { useState, useEffect, memo } from 'react';
import { CheckCircle, ArrowCounterClockwise } from '@phosphor-icons/react';
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/app/utils/cn';
import { Button } from '@/shared/buttons/Button';

// --- ТИПЫ ДАННЫХ ---
interface Letter {
  id: string;
  char: string;
}

interface Chunk {
  id: string;
  items: Letter[];
  status?: 'idle' | 'correct' | 'incorrect';
}

interface RoundData {
  id: string;
  chunks: Chunk[];
  targetWords: string[];
}

const TOTAL_ROUNDS = 5;

const RAW_ROUNDS = [
  {
    raw: 'Э | то т | ми р | при | ду | ма н | не | на | ми',
    target: ['Э', 'то', 'тми', 'рпри', 'ду', 'ма', 'нне', 'на', 'ми'],
  },
  {
    raw: 'На | де ж | да | мо й | ко м | па с | зе м | ной',
    target: ['На', 'де', 'жда', 'мо', 'йко', 'мпа', 'сзе', 'мной'],
  },
  {
    raw: 'Пу s т ь | бе | гу т | не | у | клю | же',
    target: ['Пу', 'стьбе', 'гу', 'тне', 'у', 'клю', 'же'],
  },
  {
    raw: 'Я | с во | bo | де н | сло в | но | пти | ца',
    target: ['Я', 'сво', 'бо', 'де', 'нсло', 'вно', 'пти', 'ца'],
  },
  {
    raw: 'Све | ti т | не | зна | ко | ма | я | зве | зда',
    target: ['Све', 'ти', 'тне', 'зна', 'ко', 'ма', 'я', 'зве', 'зда'],
  },
];

const generateSession = (): RoundData[] => {
  const shuffled = [...RAW_ROUNDS].sort(() => 0.5 - Math.random()).slice(0, TOTAL_ROUNDS);

  return shuffled.map((round, rIdx) => {
    const chunksStr = round.raw.split('|').map((s) => s.trim());
    const chunks: Chunk[] = chunksStr.map((chunkStr, cIdx) => {
      const items: Letter[] = [];
      let lIdx = 0;
      for (let i = 0; i < chunkStr.length; i++) {
        if (chunkStr[i] === ' ') continue;
        items.push({
          id: `r${rIdx}-c${cIdx}-l${lIdx++}`,
          char: chunkStr[i],
        });
      }
      return { id: `r${rIdx}-chunk-${cIdx}`, items, status: 'idle' };
    });

    return { id: `round-${rIdx}`, chunks, targetWords: round.target };
  });
};

// --- МЕМОИЗИРОВАННЫЙ КОМПОНЕНТ КАРТОЧКИ ---
const LetterCard = memo(({ char, isDragging, isOverlay }: { char: string; isDragging?: boolean; isOverlay?: boolean }) => {
  return (
    <div
      className={cn(
        "flex h-9 w-7 select-none items-center justify-center rounded-lg border-3 text-sm font-bold transform-gpu transition-colors xs:h-10 xs:w-8 xs:text-base sm:h-11 sm:w-9 sm:text-lg md:h-12 md:w-10 md:text-xl",
        isDragging
          ? "opacity-20 bg-surface/40 border-primary/10 text-text/20"
          : "bg-surface border-primary/20 text-text",
        !isDragging && !isOverlay && "hover:bg-primary/10 hover:border-primary/50",
        isOverlay && "opacity-90 shadow-2xl bg-primary border-primary text-white scale-105 rotate-2 cursor-grabbing"
      )}
    >
      {char}
    </div>
  );
});

LetterCard.displayName = 'LetterCard';

// --- КОМПОНЕНТ ДЛЯ СОРТИРОВКИ ---
const SortableLetter = ({ item }: { item: Letter }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
    willChange: isDragging ? 'transform' : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <LetterCard char={item.char} isDragging={isDragging} />
    </div>
  );
};

// --- КОМПОНЕНТ СЛОГА (КОНТЕЙНЕРА) ---
const ChunkContainer = ({ chunk }: { chunk: Chunk }) => {
  const { setNodeRef } = useDroppable({ id: chunk.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[46px] min-w-[40px] flex-row flex-nowrap items-center gap-0.5 rounded-xl border p-1 shadow-inner transition-colors duration-300 xs:min-h-[50px] xs:min-w-[44px] xs:gap-1 xs:p-1.5 sm:min-h-[56px] sm:min-w-[48px] sm:px-2",
        chunk.status === 'correct' && "bg-access/10 border-access text-access",
        chunk.status === 'incorrect' && "bg-rose-500/10 border-rose-500",
        (!chunk.status || chunk.status === 'idle') && "bg-background border-text/10"
      )}
    >
      <SortableContext items={chunk.items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
        {chunk.items.map((item) => (
          <SortableLetter key={item.id} item={item} />
        ))}
      </SortableContext>
    </div>
  );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
export const TransferRule: React.FC = () => {
  const [sessionData, setSessionData] = useState<RoundData[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  
  const [activeDragItem, setActiveDragItem] = useState<Letter | null>(null);
  const [roundResults, setRoundResults] = useState<boolean[]>([]);
  const [score, setScore] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const isCompleted = currentRound >= TOTAL_ROUNDS;

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 8 
      } 
    }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 150, // Оптимальная задержка для тач-скринов
        tolerance: 8
      } 
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const data = generateSession();
    setSessionData(data);
    if (data.length > 0) setChunks(data[0].chunks);
  }, []);

  const findContainerId = (id: string) => {
    if (chunks.some((c) => c.id === id)) return id;
    const chunk = chunks.find((c) => c.items.some((i) => i.id === id));
    return chunk ? chunk.id : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeItem = chunks.flatMap((c) => c.items).find((i) => i.id === active.id);
    if (activeItem) setActiveDragItem(activeItem);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainerId = findContainerId(activeId);
    const overContainerId = findContainerId(overId);

    if (!activeContainerId || !overContainerId || activeContainerId === overContainerId) {
      return;
    }

    setChunks((prev) => {
      const activeContainerIndex = prev.findIndex((c) => c.id === activeContainerId);
      const overContainerIndex = prev.findIndex((c) => c.id === overContainerId);

      const activeItems = [...prev[activeContainerIndex].items];
      const overItems = [...prev[overContainerIndex].items];

      const activeItemIndex = activeItems.findIndex((i) => i.id === activeId);
      const itemToMove = activeItems[activeItemIndex];

      activeItems.splice(activeItemIndex, 1);

      const overItemIndex = overItems.findIndex((i) => i.id === overId);
      const insertIndex = overItemIndex >= 0 ? overItemIndex : overItems.length;

      overItems.splice(insertIndex, 0, itemToMove);

      const newChunks = [...prev];
      newChunks[activeContainerIndex] = { ...newChunks[activeContainerIndex], items: activeItems };
      newChunks[overContainerIndex] = { ...newChunks[overContainerIndex], items: overItems };

      return newChunks;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainerId = findContainerId(activeId);
    const overContainerId = findContainerId(overId);

    if (activeContainerId && activeContainerId === overContainerId) {
      const containerIndex = chunks.findIndex((c) => c.id === activeContainerId);
      const items = chunks[containerIndex].items;
      const activeIndex = items.findIndex((i) => i.id === activeId);
      const overIndex = items.findIndex((i) => i.id === overId);

      if (activeIndex !== overIndex) {
        setChunks((prev) => {
          const newChunks = [...prev];
          newChunks[containerIndex] = {
            ...newChunks[containerIndex],
            items: arrayMove(items, activeIndex, overIndex),
          };
          return newChunks;
        });
      }
    }
  };

  const checkAnswer = () => {
    if (isTransitioning || isCompleted) return;

    const targetWords = sessionData[currentRound].targetWords;
    let allCorrect = true;

    const validatedChunks = chunks.map((chunk, index): Chunk => {
      const currentWord = chunk.items.map((i) => i.char).join('');
      const isChunkCorrect = currentWord === targetWords[index];
      if (!isChunkCorrect) allCorrect = false;

      return { 
        ...chunk, 
        status: isChunkCorrect ? 'correct' : 'incorrect' 
      };
    });

    setChunks(validatedChunks);
    setIsCorrect(allCorrect);
    setIsTransitioning(true);
    setRoundResults((prev) => [...prev, allCorrect]);

    if (allCorrect) setScore((prev) => prev + 1);

    setTimeout(() => {
      setIsCorrect(null);
      setIsTransitioning(false);

      if (currentRound + 1 >= TOTAL_ROUNDS) {
        setCurrentRound(TOTAL_ROUNDS);
      } else {
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);
        setChunks(sessionData[nextRound].chunks);
      }
    }, 2500); 
  };

  const restartTrainer = () => {
    const data = generateSession();
    setSessionData(data);
    setChunks(data[0].chunks);
    setCurrentRound(0);
    setScore(0);
    setRoundResults([]);
    setIsCorrect(null);
    setIsTransitioning(false);
  };

  return (
    <div className="relative flex min-h-[400px] w-full max-w-3xl flex-col justify-between overflow-hidden rounded-2xl border border-primary/20 bg-surface p-3.5 shadow-lg sm:p-6 md:p-10">
      
      {!isCompleted && (
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <span className="text-xs text-text/60 sm:text-sm">
            Раунд {Math.min(currentRound + 1, TOTAL_ROUNDS)} из {TOTAL_ROUNDS}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
              const wasAnswered = i < roundResults.length;
              const isCorrectGuess = roundResults[i];
              const isCurrent = i === currentRound;

              return (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300 sm:h-2.5 sm:w-2.5",
                    wasAnswered
                      ? isCorrectGuess
                        ? "bg-access"
                        : "bg-rose-600"
                      : isCurrent
                      ? "scale-110 bg-accent"
                      : "bg-text/20"
                  )}
                />
              );
            })}
          </div>
        </div>
      )}

      {!isCompleted && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2 xs:py-4 sm:gap-8">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-wrap items-center justify-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4">
              {chunks.map((chunk) => (
                <ChunkContainer key={chunk.id} chunk={chunk} />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 150 }}>
              {activeDragItem ? <LetterCard char={activeDragItem.char} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {!isCompleted && (
        <div className="mt-4 w-full sm:mt-8">
          <Button
            variant={isCorrect !== null ? "solid" : "outline"}
            color={
              isCorrect === true ? "access" :
              isCorrect === false ? "primary" : "accent"
            }
            onClick={checkAnswer}
            disabled={isTransitioning}
            className={cn(
              "w-full py-3 text-sm font-medium xs:py-3.5 xs:text-base sm:py-4 sm:text-lg",
              isCorrect === false && "!bg-rose-600 !border-rose-600 !text-white"
            )}
          >
            {isCorrect === true
              ? "Отлично!"
              : isCorrect === false
              ? "Есть ошибки"
              : "Проверить перенос"}
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="absolute inset-0 z-30 flex animate-in flex-col items-center justify-center bg-background/90 p-4 backdrop-blur-md fade-in duration-500 sm:p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-12 w-12 text-access sm:h-16 sm:w-16" weight="fill" />
            <h3 className="text-lg font-bold text-text sm:text-2xl">Тренировка завершена</h3>
            <p className="text-xs text-text/70 sm:text-sm">
              Ваш результат:{' '}
              <span className="text-sm font-bold text-access xs:text-base sm:text-lg">{score} из {TOTAL_ROUNDS}</span> правильных ответов
            </p>
            <Button
              variant="outline"
              color="primary"
              size="md"
              className="mt-4 gap-2 py-2.5 px-4 text-sm sm:mt-6 sm:text-base"
              onClick={restartTrainer}
            >
              <ArrowCounterClockwise size={18} />
              Начать заново
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};