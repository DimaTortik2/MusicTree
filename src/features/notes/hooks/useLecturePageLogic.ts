import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useCurrentProgress } from "@/app/hooks/useCurrentProgress";
import { useAppModeStore } from "@/app/store/useAppModeStore";
import { useAuthStore } from "@/app/store/authStore";
import { useNotesStore } from "@/features/notes/store/useNotesStore";
import { contentConfig } from "@/contentConfig";

export const useLecturePageLogic = () => {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<Record<string, HTMLDivElement | null>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    currentLesson,
    passLesson,
    passedLessons,
    halfPassedLessons,
    halfPassLesson,
  } = useCurrentProgress();
  const { activeSharedFriend, sharedTreeId } = useAppModeStore();
  const { user, profile } = useAuthStore();

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const {
    notes,
    fetchNotes,
    subscribeToNotes,
    addNote,
    activeNoteId,
    activeFocusMode,
    setActiveNoteId,
    pendingDeletionIds,
  } = useNotesStore();

  const [createModalData, setCreateModalData] = useState<
    { text: string; prefix: string; suffix: string; offset: number } | null
  >(null);
  const [mobilePopover, setMobilePopover] = useState<
    { noteId: string; rect: DOMRect } | null
  >(null);
  const [noteLayout, setNoteLayout] = useState<
    Record<
      string,
      { y: number; isGrouped: boolean; zIndex: number; scale: number }
    >
  >({});

  const lesson = useMemo(
    () => contentConfig.find((l) => l.id === currentLesson) || contentConfig[0],
    [currentLesson],
  );
  const isPassed = useMemo(() => passedLessons.includes(lesson.id), [
    passedLessons,
    lesson.id,
  ]);

  const isSharedMode = !!activeSharedFriend;
  const whoFinishedFirst = halfPassedLessons?.[lesson.id];
  const iFinishedFirst = isSharedMode && whoFinishedFirst === user?.id;
  const friendFinishedFirst = isSharedMode && whoFinishedFirst &&
    whoFinishedFirst !== user?.id;
  const canUseNotes = isSharedMode && !!profile?.can_use_notes;

  // Загрузка заметок
  useEffect(() => {
    if (canUseNotes && sharedTreeId && lesson.id) {
      fetchNotes(sharedTreeId, lesson.id);
      const unsub = subscribeToNotes(sharedTreeId, lesson.id);
      return () => unsub();
    }
  }, [canUseNotes, sharedTreeId, lesson.id, fetchNotes, subscribeToNotes]);

  // Закрытие поповеров при скролле и клике вне области
  useEffect(() => {
    const handleScroll = () => {
      // Спасает от ненужных проверок и вызовов, если поповер и так закрыт
      setMobilePopover((prev) => (prev !== null ? null : prev));
    };

    // ИСПРАВЛЕНИЕ: Закрываем поповер при тапе вне карточки
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // Если клик был не по карточке заметки и не по маркеру текста - закрываем
      if (
        !target.closest('[id^="note-card-"]') &&
        !target.closest('[id^="note-mark-"]')
      ) {
        setMobilePopover(null);
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  // Алгоритм умного позиционирования (теперь ориентируется на asideRef)
  const updateNotePositions = useCallback(() => {
    if (!contentRef.current || notes.length === 0) return;

    const newLayout: Record<
      string,
      { y: number; isGrouped: boolean; zIndex: number; scale: number }
    > = {};
    const baseTop = asideRef.current
      ? asideRef.current.getBoundingClientRect().top
      : contentRef.current.getBoundingClientRect().top;

    // ИСПРАВЛЕНИЕ: Игнорируем заметки, которые ожидают удаления!
    // Благодаря этому нижние карточки плавно съедутся вверх и закроют "пустое место".
    const visibleNotes = notes.filter((n) =>
      !pendingDeletionIds.includes(n.id)
    );

    const sortedNotes = [...visibleNotes].sort((a, b) =>
      a.text_offset - b.text_offset
    );

    // Шаг А: Узнаем "идеальные" позиции маркеров
    const notesWithTargets = sortedNotes.map((note) => {
      const mark = document.getElementById(`note-mark-${note.id}`);
      const targetY = mark ? mark.getBoundingClientRect().top - baseTop : 0;
      const height = notesRef.current[note.id]?.offsetHeight || 80;
      return { note, targetY, height };
    });

    // Шаг Б: Разбиваем заметки на кластеры по близости
    const CLUSTER_DISTANCE = 120; // Пикселей между маркерами для объединения в стопку
    const clusters: (typeof notesWithTargets)[] = [];
    let currentCluster: typeof notesWithTargets = [];

    notesWithTargets.forEach((item) => {
      if (currentCluster.length === 0) {
        currentCluster.push(item);
      } else {
        const firstItem = currentCluster[0];
        // Если маркер рядом с началом кластера — кидаем в эту же стопку
        if (item.targetY - firstItem.targetY < CLUSTER_DISTANCE) {
          currentCluster.push(item);
        } else {
          clusters.push(currentCluster);
          currentCluster = [item];
        }
      }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);

    // Шаг В: Рассчитываем физические координаты (разворачиваем или сжимаем)
    let nextMinY = 0;
    const STANDARD_GAP = 16;
    const GROUP_GAP = 6;
    const STACK_OFFSET = 12; // На сколько пикселей торчит следующая карточка в стопке
    const SCALE_STEP = 0.03; // Насколько уменьшаем масштаб задних карточек

    clusters.forEach((cluster) => {
      // Кластер считается активным, если хоть одна заметка внутри него == activeNoteId
      const isActiveCluster = cluster.some((item) =>
        item.note.id === activeNoteId
      );

      let clusterStartY = Math.max(cluster[0].targetY, nextMinY);

      cluster.forEach((item, index) => {
        let finalY = clusterStartY;
        let scale = 1;
        let zIndex = 10 - index; // Чем глубже в стопке, тем ниже z-index
        let isGrouped = false;

        const prevItem = index > 0 ? cluster[index - 1] : null;
        const isSameAuthor = prevItem &&
          prevItem.note.author_id === item.note.author_id;

        if (isActiveCluster) {
          // --- РАЗВЕРНУТОЕ СОСТОЯНИЕ ---
          if (item.note.id === activeNoteId) zIndex = 50; // Активную вытаскиваем поверх всех

          if (
            isSameAuthor &&
            clusterStartY <=
              (newLayout[prevItem!.note.id]?.y || 0) + prevItem!.height + 40
          ) {
            isGrouped = true;
            finalY = clusterStartY;
          } else {
            finalY = clusterStartY;
          }
          // Обновляем Y для следующей карточки на ПОЛНУЮ ВЫСОТУ
          clusterStartY = finalY + item.height +
            (isGrouped ? GROUP_GAP : STANDARD_GAP);
        } else {
          // --- СВЕРНУТОЕ СОСТОЯНИЕ (СТОПКА) ---
          finalY = clusterStartY + (index * STACK_OFFSET); // Карточки наслаиваются
          scale = 1 - (index * SCALE_STEP);
          isGrouped = false; // В стопках шапки оставляем видимыми для создания эффекта "колоды карт"
        }

        newLayout[item.note.id] = { y: finalY, isGrouped, zIndex, scale };
      });

      // Обновляем общую минимальную высоту для следующего кластера
      if (isActiveCluster) {
        nextMinY = clusterStartY;
      } else {
        // Если стопка свернута, она занимает мало места (высота 1-ой карты + хвост)
        nextMinY = clusterStartY + cluster[0].height +
          (cluster.length - 1) * STACK_OFFSET + STANDARD_GAP;
      }
    });

    setNoteLayout((prev) => {
      const isDifferent = JSON.stringify(prev) !== JSON.stringify(newLayout);
      return isDifferent ? newLayout : prev;
    });
  }, [notes, activeNoteId, pendingDeletionIds]); // <-- Важно! Добавили activeNoteId в зависимости

  useEffect(() => {
    updateNotePositions();
  }, [updateNotePositions, activeNoteId, notes, pendingDeletionIds]);

  useEffect(() => {
    if (!canUseNotes || !contentRef.current) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    let previousWidth = contentRef.current?.offsetWidth || 0;

    const observer = new ResizeObserver((entries) => {
      // Ищем изменение именно основного контейнера
      const contentEntry = entries.find((e) => e.target === contentRef.current);
      if (contentEntry) {
        const currentWidth = contentEntry.contentRect.width;
        // Если ширина не изменилась (изменилась только высота), ничего не делаем!
        if (currentWidth === previousWidth) return;
        previousWidth = currentWidth;
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateNotePositions();
      }, 30);
    });

    // 1. Наблюдаем за основным текстом (на случай загрузки картинок)
    if (contentRef.current) observer.observe(contentRef.current);

    // 2. ИСПРАВЛЕНИЕ: Наблюдаем за КАЖДОЙ отдельной карточкой!
    // Так как они absolute, asideRef не "видит" их роста.
    const currentNotesRef = notesRef.current;
    Object.values(currentNotesRef).forEach((cardEl) => {
      if (cardEl) observer.observe(cardEl);
    });

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [canUseNotes, updateNotePositions, notes]); // ВАЖНО: добавили notes в зависимости, чтобы отслеживать новые заметки

  const fireConfetti = () => {
    const root = getComputedStyle(document.documentElement);
    const colors = [root.getPropertyValue("--primary").trim() || "#ec4899"];
    confetti({
      particleCount: 500,
      spread: 200,
      startVelocity: 45,
      origin: { y: 0.4 },
      colors,
      zIndex: 1000,
    });
  };

  const handleFinish = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowSuccessOverlay(false);
    if (isSharedMode && !friendFinishedFirst && !iFinishedFirst && user) {
      halfPassLesson(lesson.id, user.id);
      navigate("/app/tree");
    } else {
      passLesson(lesson.id);
      navigate("/app/tree");
    }
  };

  const handleCompleteClick = () => {
    fireConfetti();
    setShowSuccessOverlay(true);
  };

  useEffect(() => {
    if (showSuccessOverlay) {
      timerRef.current = setTimeout(() => handleFinish(), 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showSuccessOverlay]);

  // Сброс выделения при клике по фону
  const handlePageClick = () => {
    setActiveNoteId(null);
  };

  return {
    refs: { pageRef, contentRef, asideRef, notesRef },
    state: {
      showSuccessOverlay,
      mobilePopover,
      createModalData,
      noteLayout,
      activeNoteId,
      activeFocusMode,
    },
    computed: {
      lesson,
      isPassed,
      isSharedMode,
      canUseNotes,
      iFinishedFirst,
      friendFinishedFirst,
    },
    actions: {
      handleCompleteClick,
      handleFinish,
      setMobilePopover,
      setCreateModalData,
      updateNotePositions,
      handlePageClick,
    },
    notesData: { notes, addNote, user, sharedTreeId },
  };
};
