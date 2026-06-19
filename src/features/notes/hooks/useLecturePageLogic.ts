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
   const { notes, fetchNotes, subscribeToNotes, addNote, activeNoteId, activeFocusMode, setActiveNoteId } = useNotesStore();


  const [createModalData, setCreateModalData] = useState<
    { text: string; prefix: string; suffix: string; offset: number } | null
  >(null);
  const [mobilePopover, setMobilePopover] = useState<
    { noteId: string; rect: DOMRect } | null
  >(null);
  const [noteLayout, setNoteLayout] = useState<
    Record<string, { y: number; isGrouped: boolean }>
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

  // Закрытие поповеров при скролле и снятие фокуса при скролле
  useEffect(() => {
    const handleScroll = () => {
      setMobilePopover(null);
    };
    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    return () =>
      window.removeEventListener("scroll", handleScroll, { capture: true });
  }, []);

  // Алгоритм умного позиционирования (теперь ориентируется на asideRef)
  const updateNotePositions = useCallback(() => {
    if (!contentRef.current || notes.length === 0) return;

    const newLayout: Record<string, { y: number; isGrouped: boolean }> = {};
    let nextMinY = 0;
    const STANDARD_GAP = 16;
    const GROUP_GAP = 6;
    const GROUP_THRESHOLD = 60;

    // Базовая верхняя точка (начало правой колонки)
    const baseTop = asideRef.current
      ? asideRef.current.getBoundingClientRect().top
      : contentRef.current.getBoundingClientRect().top;
    const sortedNotes = [...notes].sort((a, b) =>
      a.text_offset - b.text_offset
    );

    sortedNotes.forEach((note, index) => {
      const mark = document.getElementById(`note-mark-${note.id}`);
      const noteEl = notesRef.current[note.id];

      let targetY = nextMinY;
      if (mark) {
        targetY = mark.getBoundingClientRect().top - baseTop;
      }

      const prevNote = index > 0 ? sortedNotes[index - 1] : null;
      const isSameAuthor = prevNote && prevNote.author_id === note.author_id;
      const prevBottom = index > 0 ? nextMinY - STANDARD_GAP : 0;

      let isGrouped = false;
      let finalY = targetY;

      if (isSameAuthor && targetY <= prevBottom + GROUP_THRESHOLD) {
        isGrouped = true;
        finalY = Math.max(targetY, prevBottom + GROUP_GAP);
      } else {
        finalY = Math.max(targetY, nextMinY);
      }

      newLayout[note.id] = { y: finalY, isGrouped };
      const height = noteEl?.offsetHeight || 80;
      nextMinY = finalY + height + STANDARD_GAP;
    });

    setNoteLayout((prev) => {
      const isDifferent = sortedNotes.some((n) =>
        prev[n.id]?.y !== newLayout[n.id]?.y ||
        prev[n.id]?.isGrouped !== newLayout[n.id]?.isGrouped
      );
      return isDifferent ? newLayout : prev;
    });
  }, [notes]);

  useEffect(() => {
    if (!canUseNotes || !contentRef.current) return;
    const observer = new ResizeObserver(() => updateNotePositions());
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [canUseNotes, updateNotePositions]);

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
  // Плавное автоматическое снятие фокуса (затемнения других карточек) через 2 секунды
  useEffect(() => {
    if (!activeNoteId) return;

    const timer = setTimeout(() => {
      setActiveNoteId(null);
    }, 1000); // 1000 мс обычно идеально для эффекта "вспышки внимания"

    return () => clearTimeout(timer);
  }, [activeNoteId, setActiveNoteId]);

  return {
    refs: { pageRef, contentRef, asideRef, notesRef },
    state: {
      showSuccessOverlay,
      mobilePopover,
      createModalData,
      noteLayout,
      activeNoteId,
      activeFocusMode
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
