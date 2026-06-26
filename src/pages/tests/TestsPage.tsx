import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { GitFork } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { cn } from '@/app/utils/cn';
import { Modal } from '@/shared/Modal';
import { DetailLayout } from '@/shared/layouts/DetailLayout';
import { useTestsData } from './useTestsData';
import { TestRunner } from './TestRunner';
import { useRememberSelection } from '@/shared/hooks/useRememberSelection';
import { ViewToggle } from '@/shared/buttons/ViewToggle';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { useFriendProgress } from '@/shared/hooks/useFriendProgress';
// ✨ Добавляем framer-motion
import { AnimatePresence, motion, type Variants } from 'framer-motion';

// ✨ Те же варианты затухания
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

export const TestsPage = () => {
  const navigate = useNavigate();
  const { testId } = useParams();

  const activeSharedFriend = useAppModeStore((s) => s.activeSharedFriend);
  const [viewTarget, setViewTarget] = useState<'me' | 'friend'>('me');
  const { progress: friendProgress } = useFriendProgress(activeSharedFriend?.id);

  const friendPassedLessons = friendProgress?.passedLessons;
  const friendPassedTests = friendProgress?.passedTests;

  const data = useTestsData(
    viewTarget === 'friend' ? friendPassedLessons : undefined,
    viewTarget === 'friend' ? friendPassedTests : undefined
  );

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const [isTestDirty, setIsTestDirty] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isTestDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setPendingAction(() => () => blocker.proceed?.());
      setShowLeaveModal(true);
    }
  }, [blocker.state]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTestDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTestDirty]);

  const selectedTest = data.allItems.find((t) => t.id === testId);

  useEffect(() => {
    if (testId && data.allItems.length > 0 && !data.allItems.some((t) => t.id === testId)) {
      const firstId = data.allItems[0]?.id;
      if (firstId) {
        navigate(`/app/tests/${firstId}`, { replace: true });
      }
    }
  }, [viewTarget, data.allItems, testId, navigate]);

  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }

    if (testId) {
      const timer = setTimeout(() => {
        const item = document.getElementById(`test-item-${testId}`);
        if (item) {
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [testId, selectedTest?.isPassed]);

  const getSavedId = useRememberSelection('music-tree-last-test', testId, (id) =>
    data.allItems.some((t) => t.id === id),
  );

  useEffect(() => {
    if (!testId && !data.isEmpty && data.allItems.length > 0) {
      const savedId = getSavedId();

      const defaultId =
        savedId ||
        (data.activeItems.length > 0
          ? data.activeItems[data.activeItems.length - 1].id
          : data.archivedItems[data.archivedItems.length - 1].id);

      navigate(`/app/tests/${defaultId}`, { replace: true });
    }
  }, [testId, data, navigate, getSavedId]);

  const confirmLeave = () => {
    setIsTestDirty(false);
    setShowLeaveModal(false);

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setIsMobileOpen(false);
  };

  const cancelLeave = () => {
    setShowLeaveModal(false);
    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
    setPendingAction(null);
  };

  const EmptyState = viewTarget === 'friend' ? (
    <Modal
      inline
      layout="horizontal"
      title="У друга пока нет пройденных тестов"
      description="Как только друг пройдет хотя бы один тест, его результат появится здесь"
      icon={<GitFork className="size-8 sm:size-10" weight="regular" />}
      iconContainerClassName="bg-primary"
    />
  ) : (
    <Modal
      inline
      layout="horizontal"
      title="После прохождения первого урока эта страница пополнится первым тестом"
      description="Тесты будут накапливаться, Вы всегда сможете найти их здесь"
      icon={<GitFork className="size-8 sm:size-10" weight="regular" />}
      onIconClick={() => navigate('/app/tree', { replace: true })}
      iconContainerClassName="bg-primary"
    />
  );

  const ListContent = (
    <>
      {activeSharedFriend && (
        <div className="mb-6 flex w-full justify-center">
          <div className="w-full scale-90">
            <ViewToggle
              viewTarget={viewTarget}
              onChange={setViewTarget}
              color="accent"
            />
          </div>
        </div>
      )}

      {viewTarget === 'me' && data.activeGroups.map((group, i) => (
        <div key={`active-${group.lessonId}`} className="mb-2">
          <div className="space-y-2">
            {group.items.map((test) => (
              <Button
                id={`test-item-${test.id}`}
                key={test.id}
                variant={testId === test.id ? 'solid' : 'outline'}
                color="accent"
                className="h-auto w-full scale-90 flex-col items-start justify-start gap-1 p-5 shadow-lg transition-all hover:scale-92"
                onClick={() => {
                  navigate(`/app/tests/${test.id}`);
                  if (window.innerWidth < 768) setIsMobileOpen(true);
                }}
                size="md"
              >
                <span
                  className={cn(
                    'text-[22px] leading-tight font-normal tracking-wide',
                    testId === test.id ? 'text-white' : 'text-text',
                  )}
                >
                  {test.title}
                </span>
                <span
                  className={cn(
                    'text-[15px] font-light',
                    testId === test.id ? 'text-white/70' : 'text-text/40',
                  )}
                >
                  {test.lessonTitle}
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
            {group.items.map((test) => {
              const isSelected = testId === test.id;
              return (
                <Button
                  id={`test-item-${test.id}`}
                  key={test.id}
                  variant={isSelected ? 'solid' : 'outline'}
                  color="accent"
                  className={cn(
                    '!h-auto w-full scale-90 flex-col !items-start !justify-start gap-1 p-5 shadow-lg',
                    viewTarget === 'friend'
                      ? isSelected
                        ? 'bg-surface/50 border-accent/60 text-text/60 shadow-md'
                        : 'bg-surface/20 border-line/40 text-text/40 hover:bg-surface/30'
                      : cn(
                          'transition-all hover:scale-92',
                          'opacity-40 hover:opacity-70',
                        )
                  )}
                  onClick={() => {
                    navigate(`/app/tests/${test.id}`);
                    if (window.innerWidth < 768) setIsMobileOpen(true);
                  }}
                >
                  <div className="flex w-full items-start justify-between">
                    <div className="flex flex-col text-left">
                      <span
                        className={cn(
                          'text-[22px] leading-tight font-normal tracking-wide',
                          viewTarget === 'friend'
                            ? 'text-text/50'
                            : isSelected ? 'text-white' : 'text-text/40',
                        )}
                      >
                        {test.title}
                      </span>
                      <span
                        className={cn(
                          'text-[15px] font-light',
                          viewTarget === 'friend'
                            ? 'text-text/30'
                            : isSelected ? 'text-white/70' : 'text-text/40',
                        )}
                      >
                        {test.lessonTitle}
                      </span>
                    </div>
                    {test.score !== undefined && (
                      <span className={cn(
                        'rounded-md px-2 py-1 text-sm font-medium',
                        viewTarget === 'friend' ? 'text-text/50' : 'text-text'
                      )}>
                        {test.score}/{test.maxScore}
                      </span>
                    )}
                  </div>
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

  // ✨ Оборачиваем TestRunner в AnimatePresence и motion.div
  const DetailContent = (
    <>
      <AnimatePresence mode="wait">
        {selectedTest && (
          <motion.div
            key={selectedTest.id}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentTransitionVariants}
            className="flex flex-1 flex-col"
          >
            <TestRunner
              test={selectedTest}
              onDirtyStateChange={setIsTestDirty}
              isReadOnly={viewTarget === 'friend'}
              friendPassedTests={friendPassedTests}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showLeaveModal}
        onClose={cancelLeave}
        layout="vertical"
        title="Вы не закончили тест. Вы уверены, что хотите покинуть страницу?"
        description={
          <span className="text-text/40">
            Лучше закончить выполнение теста, чем потерять его прогресс
          </span>
        }
        className="max-w-2xl rounded-[32px] p-8 md:p-10"
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              color="primary"
              onClick={cancelLeave}
              className="w-full px-4 sm:flex-1"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="md"
              color="primary"
              onClick={confirmLeave}
              className="w-full px-4 sm:flex-1"
            >
              Да, уверен
            </Button>
          </>
        }
      />
    </>
  );

  return (
    <DetailLayout
      isEmpty={data.isEmpty}
      emptyState={EmptyState}
      isMobileDetailOpen={isMobileOpen}
      onBackClick={() => {
        if (isTestDirty) {
          setShowLeaveModal(true);
        } else {
          setIsMobileOpen(false);
        }
      }}
      listContent={ListContent}
      detailContent={DetailContent}
      listRef={listRef}
      detailRef={detailRef}
    />
  );
};
