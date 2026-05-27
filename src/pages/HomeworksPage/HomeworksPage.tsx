import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProgressStore } from '@/app/store/useProgressStore';
import { GitFork } from '@phosphor-icons/react';
import { Button } from '@/shared/Button';
import { cn } from '@/app/utils/cn';
import confetti from 'canvas-confetti';
import { useHomeworksData } from './useHomeworksData';
import { DetailLayout } from '@/shared/layouts/DetailLayout';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import { Modal } from '@/shared/Modal';

const mdxFiles = import.meta.glob('/src/content/*.mdx');

const mdxComponentsCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const path in mdxFiles) {
  mdxComponentsCache[path] = React.lazy(
    mdxFiles[path] as () => Promise<{ default: React.ComponentType<any> }>,
  );
}

export const HomeworksPage = () => {
  const navigate = useNavigate();
  const { homeworkId } = useParams();

  const { passHomework, returnHomeworkFromArchive, passedHomeworks } = useProgressStore();
  const data = useHomeworksData();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }
  }, [homeworkId]);

  useEffect(() => {
    if (!homeworkId && !data.isEmpty && data.allItems.length > 0) {
      const defaultId =
        data.activeItems.length > 0
          ? data.activeItems[data.activeItems.length - 1].id
          : data.archivedItems[data.archivedItems.length - 1].id;

      navigate(`/app/homeworks/${defaultId}`, { replace: true });
    }
  }, [homeworkId, data, navigate]);

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
    passHomework(homeworkId);
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
          <div className="space-y-4">
            {group.items.map((hw) => (
              <Button
                id={`hw-item-${hw.id}`}
                key={hw.id}
                variant={homeworkId === hw.id ? 'solid' : 'outline'}
                color="homework"
                className="!h-auto w-full flex-col !items-start !justify-start gap-1 p-5 shadow-lg"
                onClick={() => handleSelect(hw.id)}
              >
                <span
                  className={cn(
                    'text-[22px] leading-tight font-normal tracking-wide',
                    homeworkId === hw.id ? 'text-text' : 'text-text',
                  )}
                >
                  {hw.title}
                </span>
                <span
                  className={cn(
                    'text-[15px] font-light',
                    homeworkId === hw.id ? 'text-text/70' : 'text-text/40',
                  )}
                >
                  {hw.lessonTitle}
                </span>
              </Button>
            ))}
          </div>
          {(i < data.activeGroups.length - 1 || data.archivedGroups.length > 0) && (
            <div className="mx-auto my-8 h-[2px] w-24 rounded-full bg-surface" />
          )}
        </div>
      ))}

      {data.archivedGroups.length > 0 && (
        <div className="mt-8 mb-6 flex items-center gap-4">
          <hr className="flex-1 border-surface" />
          <span className="text-sm text-text/40">Архив</span>
          <hr className="flex-1 border-surface" />
        </div>
      )}

      {data.archivedGroups.map((group, i) => (
        <div key={`archive-${group.lessonId}`} className="mb-2">
          <div className="space-y-4">
            {group.items.map((hw) => {
              // 👇 Определяем, является ли этот элемент архивированным
              const isArchived = passedHomeworks.includes(hw.id);
              const isSelected = homeworkId === hw.id;

              return (
                <Button
                  id={`hw-item-${hw.id}`}
                  key={hw.id}
                  variant={isSelected ? 'solid' : 'outline'}
                  color="homework"
                  className={cn(
                    '!h-auto w-full flex-col !items-start !justify-start gap-1 p-5 transition-opacity duration-300',
                    // 👇 Если элемент в архиве (даже если выбран), добавляем прозрачность
                    isArchived && 'opacity-40 hover:opacity-70',
                  )}
                  onClick={() => handleSelect(hw.id)}
                >
                  <span className="text-[22px] leading-tight font-normal tracking-wide text-text">
                    {hw.title}
                  </span>
                  <span
                    className={cn(
                      'text-[15px] font-light',
                      isSelected ? 'text-text/70' : 'text-text/40',
                    )}
                  >
                    {hw.lessonTitle}
                  </span>
                </Button>
              );
            })}
          </div>
          {i < data.archivedGroups.length - 1 && (
            <div className="mx-auto my-8 h-[2px] w-24 rounded-full bg-surface" />
          )}
        </div>
      ))}
    </>
  );

  const DetailContent = (
    <div key={homeworkId} className="flex flex-1 flex-col">
      <div className="prose prose-invert max-w-none flex-1 text-[17px] leading-relaxed text-text">
        {LazyMdxContent ? (
          <Suspense fallback={<MdxSkeleton />}>
            <LazyMdxContent />
          </Suspense>
        ) : selectedHw ? (
          <div className="h-full py-4 font-medium text-primary">
            Файл не найден. Пожалуйста, добавьте файл по пути: {selectedHw.mdxPath}
          </div>
        ) : null}
      </div>

      <div className="mt-16 flex shrink-0 justify-center">
        {isSelectedArchived ? (
          <Button variant="outline" color="homework" size="lg" onClick={handleReturnFromArchive}>
            Вернуть из архива
          </Button>
        ) : (
          <Button variant="outline" color="homework" size="lg" onClick={handleComplete}>
            Выполнить
          </Button>
        )}
      </div>
    </div>
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
