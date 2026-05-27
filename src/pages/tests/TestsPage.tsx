// src/app/pages/tests/TestsPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { GitFork } from '@phosphor-icons/react';
import { Button } from '@/shared/Button';
import { cn } from '@/app/utils/cn';
import { Modal } from '@/shared/Modal';
import { DetailLayout } from '@/shared/layouts/DetailLayout';
import { useTestsData } from './useTestsData';
import { TestRunner } from './TestRunner';
import { useRememberSelection } from '@/shared/hooks/useRememberSelection';

export const TestsPage = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const data = useTestsData();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Стейты для защиты от выхода из активного теста
  const [isTestDirty, setIsTestDirty] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Глобальная блокировка смены роутов (навбар, кнопка назад в браузере)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isTestDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  // Обработка блокировщика роутера
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setPendingAction(() => () => blocker.proceed?.());
      setShowLeaveModal(true);
    }
  }, [blocker.state]);

  // Защита от перезагрузки страницы или закрытия вкладки (F5)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTestDirty) {
        e.preventDefault();
        e.returnValue = ''; // Standard для вызова нативного системного алерта
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTestDirty]);

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
}, [testId]);

  useEffect(() => {
    if (!testId && !data.isEmpty && data.allItems.length > 0) {
      const defaultId =
        data.activeItems.length > 0
          ? data.activeItems[data.activeItems.length - 1].id
          : data.archivedItems[data.archivedItems.length - 1].id;
      navigate(`/app/tests/${defaultId}`, { replace: true });
    }
  }, [testId, data, navigate]);

  const getSavedId = useRememberSelection('music-tree-last-test', testId, (id) =>
    data.allItems.some((t) => t.id === id),
  );

  useEffect(() => {
    if (!testId && !data.isEmpty && data.allItems.length > 0) {
      const savedId = getSavedId();

      // Твой оригинальный фоллбек
      const defaultId =
        savedId ||
        (data.activeItems.length > 0
          ? data.activeItems[data.activeItems.length - 1].id
          : data.archivedItems[data.archivedItems.length - 1].id);

      navigate(`/app/tests/${defaultId}`, { replace: true });
    }
  }, [testId, data, navigate, getSavedId]);

  const selectedTest = data.allItems.find((t) => t.id === testId);

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

  const EmptyState = (
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
      {/* АКТИВНЫЕ ТЕСТЫ */}
      {data.activeGroups.map((group, i) => (
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
                    testId === test.id ? 'text-text' : 'text-text',
                  )}
                >
                  {test.title}
                </span>
                <span
                  className={cn(
                    'text-[15px] font-light',
                    testId === test.id ? 'text-text/70' : 'text-text/40',
                  )}
                >
                  {test.lessonTitle}
                </span>
              </Button>
            ))}
          </div>
          {(i < data.activeGroups.length - 1 || data.archivedGroups.length > 0) && (
            <div className="mx-auto my-8 h-[2px] w-24 rounded-full bg-surface" />
          )}
        </div>
      ))}

      {/* РАЗДЕЛИТЕЛЬ АРХИВА */}
      {data.archivedGroups.length > 0 && (
        <div className="mt-8 mb-6 flex items-center gap-4">
          <hr className="flex-1 border-surface" />
          <span className="text-sm text-text/40">Архив</span>
          <hr className="flex-1 border-surface" />
        </div>
      )}

      {/* АРХИВНЫЕ ТЕСТЫ */}
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
                    '!h-auto w-full scale-90 flex-col !items-start !justify-start gap-1 p-5 shadow-lg transition-all hover:scale-92',
                    'opacity-40 hover:opacity-70',
                  )}
                  onClick={() => {
                    navigate(`/app/tests/${test.id}`);
                    if (window.innerWidth < 768) setIsMobileOpen(true);
                  }}
                >
                  <div className="flex w-full items-start justify-between">
                    <div className="flex flex-col text-left">
                      <span className="text-[22px] leading-tight font-normal tracking-wide text-text">
                        {test.title}
                      </span>
                      <span
                        className={cn(
                          'text-[15px] font-light',
                          isSelected ? 'text-text/70' : 'text-text/40',
                        )}
                      >
                        {test.lessonTitle}
                      </span>
                    </div>
                    {test.score !== undefined && (
                      <span className="rounded-md px-2 py-1 text-sm font-medium text-text">
                        {test.score}/{test.maxScore}
                      </span>
                    )}
                  </div>
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
    <div className="flex h-full w-full flex-1 flex-col">
      {selectedTest ? (
        <TestRunner key={selectedTest.id} test={selectedTest} onDirtyStateChange={setIsTestDirty} />
      ) : null}

      {/* Модалка попытки уйти с активного теста */}
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
    </div>
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
};;
