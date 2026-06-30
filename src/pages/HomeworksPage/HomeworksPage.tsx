import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, GitFork } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { cn } from '@/app/utils/cn';
import confetti from 'canvas-confetti';
import { useHomeworksData } from './useHomeworksData';
import { DetailLayout } from '@/shared/layouts/DetailLayout';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import { Modal } from '@/shared/Modal';
import { useRememberSelection } from '@/shared/hooks/useRememberSelection';
// ✨ Добавляем импорты framer-motion
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { SharedNotesContainer } from '@/features/notes/ui/SharedNotesContainer';
import { useCurrentProgress } from '@/app/hooks/useCurrentProgress';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { useAuthStore } from '@/app/store/authStore';

const mdxFiles = import.meta.glob('/src/content/**/*.mdx');

const mdxComponentsCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const path in mdxFiles) {
  mdxComponentsCache[path] = React.lazy(
    mdxFiles[path] as () => Promise<{ default: React.ComponentType<any> }>,
  );
}

// ✨ Варианты анимации затухания (как в AppLayout)
const contentTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.25, 0, 0.5, 1],
    },
  },
};

export const HomeworksPage = () => {
  const navigate = useNavigate();
  const { homeworkId } = useParams();

  const {
    passHomework,
    halfPassHomework,
    returnHomeworkFromArchive,
    passedHomeworks,
    halfPassedHomeworks,
  } = useCurrentProgress();
  const user = useAuthStore((s) => s.user);
  const { activeSharedFriend } = useAppModeStore();

  const data = useHomeworksData();

  const isSharedMode = !!activeSharedFriend;
  const whoFinishedFirst = halfPassedHomeworks?.[homeworkId || ''];
  const iFinishedFirst = isSharedMode && whoFinishedFirst === user?.id;
  const friendFinishedFirst = isSharedMode && !!whoFinishedFirst && whoFinishedFirst !== user?.id;

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }

    if (homeworkId) {
      const timer = setTimeout(() => {
        const item = document.getElementById(`hw-item-${homeworkId}`);
        if (item) {
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [homeworkId]);

  const getSavedId = useRememberSelection('music-tree-last-homework', homeworkId, (id) =>
    data.allItems.some((hw) => hw.id === id),
  );

  useEffect(() => {
    if (!homeworkId && !data.isEmpty && data.allItems.length > 0) {
      const savedId = getSavedId();

      const defaultId =
        savedId ||
        (data.activeItems.length > 0
          ? data.activeItems[data.activeItems.length - 1].id
          : data.archivedItems[data.archivedItems.length - 1].id);

      navigate(`/app/homeworks/${defaultId}`, { replace: true });
    }
  }, [homeworkId, data, navigate, getSavedId]);

  const selectedHw = data.allItems.find((hw) => hw.id === homeworkId);
  const isSelectedArchived = selectedHw ? passedHomeworks.includes(selectedHw.id) : false;

  const LazyMdxContent = selectedHw ? mdxComponentsCache[selectedHw.mdxPath] : null;

  const handleSelect = (id: string) => {
    navigate(`/app/homeworks/${id}`);
    if (window.innerWidth < 768) setIsMobileOpen(true);
  };

  const fireConfetti = () => {
    const root = getComputedStyle(document.documentElement);
    const colors = [
      root.getPropertyValue('--primary').trim() || '#ec4899',
      root.getPropertyValue('--accent').trim() || '#8b5cf6',
      root.getPropertyValue('--homework').trim() || '#57430b',
    ];

    confetti({
      particleCount: 250,
      spread: 120,
      startVelocity: 45,
      origin: { y: 0.6 },
      colors,
      zIndex: 1000,
    });

    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        startVelocity: 35,
        origin: { y: 0.65 },
        colors,
        zIndex: 1000,
      });
    }, 250);
  };

  const handleComplete = () => {
    if (!homeworkId) return;

    fireConfetti();

    if (isSharedMode && !friendFinishedFirst && !iFinishedFirst && user) {
      halfPassHomework(homeworkId, user.id);
    } else {
      passHomework(homeworkId);
    }

    setIsMobileOpen(false);

    setTimeout(() => {
      const item = document.getElementById(`hw-item-${homeworkId}`);
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleReturnFromArchive = () => {
    if (!homeworkId) return;

    returnHomeworkFromArchive(homeworkId);
    setIsMobileOpen(false);

    setTimeout(() => {
      const item = document.getElementById(`hw-item-${homeworkId}`);
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const EmptyState = (
    <Modal
      inline
      layout="horizontal"
      title="После прохождения первого урока эта страница пополнится первыми домашними заданиями"
      description="Они будут накапливаться здесь"
      icon={<GitFork className="size-8 sm:size-10" weight="regular" />}
      onIconClick={() => navigate('/app/tree', { replace: true })}
      iconContainerClassName="bg-primary"
    />
  );

  const ListContent = (
    <>
      {data.activeGroups.map((group, i) => (
        <div key={`active-${group.lessonId}`} className="mb-2">
          <div className="space-y-2">
            {group.items.map((hw) => (
              <Button
                id={`hw-item-${hw.id}`}
                key={hw.id}
                variant={homeworkId === hw.id ? 'solid' : 'outline'}
                color="homework"
                className="h-auto w-full scale-90 flex-col items-start justify-start gap-1 p-5 shadow-lg hover:scale-92"
                onClick={() => handleSelect(hw.id)}
                size="md"
              >
                <span
                  className={cn(
                    'text-[22px] leading-tight font-normal tracking-wide',
                    homeworkId === hw.id ? 'text-white' : 'text-text',
                  )}
                >
                  {hw.title}
                </span>
                <span
                  className={cn(
                    'text-[15px] font-light',
                    homeworkId === hw.id ? 'text-white/70' : 'text-text/40',
                  )}
                >
                  {hw.lessonTitle}
                </span>
              </Button>
            ))}
          </div>
          {(i < data.activeGroups.length - 1 || data.archivedGroups.length > 0) && (
            <div className="mx-auto my-8 h-[3px] w-24 rounded-full bg-text/10" />
          )}
        </div>
      ))}

      {data.archivedGroups.map((group, i) => (
        <div key={`archive-${group.lessonId}`} className="mb-2">
          <div className="space-y-4">
            {group.items.map((hw) => {
              const isArchived = passedHomeworks.includes(hw.id);
              const isSelected = homeworkId === hw.id;

              return (
                <Button
                  id={`hw-item-${hw.id}`}
                  key={hw.id}
                  variant={isSelected ? 'solid' : 'outline'}
                  color="homework"
                  className={cn(
                    'h-auto w-full scale-90 flex-col items-start justify-start gap-1 p-5 transition-opacity duration-300 hover:scale-92',
                    isArchived && 'opacity-40 hover:opacity-70',
                  )}
                  onClick={() => handleSelect(hw.id)}
                >
                  <span
                    className={cn(
                      'text-[22px] leading-tight font-normal tracking-wide',
                      isSelected ? 'text-white' : 'text-text/40',
                    )}
                  >
                    {hw.title}
                  </span>
                  <span
                    className={cn(
                      'text-[15px] font-light',
                      isSelected ? 'text-white/70' : 'text-text/40',
                    )}
                  >
                    {hw.lessonTitle}
                  </span>
                </Button>
              );
            })}
          </div>
          {i < data.archivedGroups.length - 1 && (
            <div className="mx-auto my-8 h-[3px] w-24 rounded-full bg-text/10" />
          )}
        </div>
      ))}
    </>
  );

  const DetailContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={homeworkId || 'empty'}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={contentTransitionVariants}
        className="flex flex-1 flex-col"
      >
        <SharedNotesContainer
          contentId={homeworkId}
          className="prose max-w-none flex-1 text-[17px] leading-relaxed text-text prose-invert"
        >
          {LazyMdxContent ? (
            <Suspense fallback={<MdxSkeleton />}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <LazyMdxContent />
              </motion.div>
            </Suspense>
          ) : selectedHw ? (
            <div className="h-full py-4 font-medium text-primary">
              Файл не найден. Пожалуйста, добавьте файл по пути: {selectedHw.mdxPath}
            </div>
          ) : null}

          {/* Кнопки теперь тоже внутри контейнера, они будут аккуратно находиться под текстом */}
          {/* Кнопки теперь тоже внутри контейнера, они будут аккуратно находиться под текстом */}
          <div className="mt-16 flex shrink-0 justify-center">
            {isSelectedArchived ? (
              <Button
                variant="outline"
                color="homework"
                size="md"
                onClick={handleReturnFromArchive}
              >
                Вернуть из архива
              </Button>
            ) : iFinishedFirst ? (
              <Button
                variant="outline"
                color="homework"
                size="md"
                className="pointer-events-none flex items-center gap-2 opacity-70"
              >
                <span>Я выполнил</span>
                <div className="relative ml-1 flex h-5 w-5 items-center justify-center">
                  <Check
                    size={18}
                    weight="bold"
                    className="absolute left-0 text-current opacity-40"
                  />
                  <Check size={18} weight="bold" className="absolute left-1.5 text-current" />
                </div>
              </Button>
            ) : friendFinishedFirst ? (
              <Button
                variant="outline"
                color="homework"
                size="md"
                onClick={handleComplete}
                className="flex items-center gap-2"
              >
                <span>Выполнить</span>
                <div className="relative ml-1 flex h-5 w-5 items-center justify-center">
                  <Check
                    size={18}
                    weight="bold"
                    className="absolute left-0 text-current opacity-40"
                  />
                  <Check size={18} weight="bold" className="absolute left-1.5 text-current" />
                </div>
              </Button>
            ) : (
              <Button variant="outline" color="homework" size="md" onClick={handleComplete}>
                Выполнить
              </Button>
            )}
          </div>
        </SharedNotesContainer>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <DetailLayout
      isEmpty={data.isEmpty}
      emptyState={EmptyState}
      isMobileDetailOpen={isMobileOpen}
      onBackClick={() => setIsMobileOpen(false)}
      listContent={ListContent}
      detailContent={DetailContent}
      listRef={listRef}
      detailRef={detailRef}
    />
  );
};
