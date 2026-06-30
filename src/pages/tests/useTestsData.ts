import { useMemo } from 'react';
 // Используем умный хук
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { useAuthStore } from '@/app/store/authStore';
import { contentConfig } from '@/contentConfig';
import { testsData, type TestConfig } from '@/content/tests/testsData';
import { useCurrentProgress } from '@/app/hooks/useCurrentProgress';

export interface MappedTest extends TestConfig {
  lessonId: string;
  lessonTitle: string;
  isPassed: boolean;
  score?: number;
  maxScore?: number;
}

export interface TestGroup {
  lessonId: string;
  lessonTitle: string;
  items: MappedTest[];
}

// Теперь хук принимает ID пользователя, чьи результаты мы хотим посмотреть
export const useTestsData = (viewUserId?: string) => {
  const currentProgress = useCurrentProgress();
  const isSharedMode = !!useAppModeStore((s) => s.sharedTreeId);
  const myId = useAuthStore((s) => s.user?.id);

  const passedLessons = currentProgress.passedLessons;
  const passedTests = currentProgress.passedTests;

  const targetId = viewUserId || myId;

  return useMemo(() => {
    const activeMap = new Map<string, TestGroup>();
    const archivedMap = new Map<string, TestGroup>();
    const allItems: MappedTest[] = [];
    const activeItems: MappedTest[] = [];
    const archivedItems: MappedTest[] = [];

    contentConfig.forEach((lesson) => {
      // База тестов общая, строится на пройденных уроках в ТЕКУЩЕМ дереве
      if (passedLessons.includes(lesson.id) && lesson.linkedTests.length > 0) {
        lesson.linkedTests.forEach((testId) => {
          const testContent = testsData[testId];
          if (!testContent) return;

          let testResult = null;
          
          if (isSharedMode && targetId) {
            // В совместном дереве достаем результат конкретного юзера
            testResult = (passedTests[testId] as any)?.[targetId];
          } else {
            // В личном дереве всё лежит линейно
            testResult = passedTests[testId];
          }

          const isPassed = !!testResult;

          const mapped: MappedTest = {
            ...testContent,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            isPassed,
            score: testResult?.score,
            maxScore: testResult?.maxScore,
          };

          allItems.push(mapped);

          const targetMap = isPassed ? archivedMap : activeMap;
          const targetList = isPassed ? archivedItems : activeItems;

          targetList.push(mapped);

          if (!targetMap.has(lesson.id)) {
            targetMap.set(lesson.id, { lessonId: lesson.id, lessonTitle: lesson.title, items: [] });
          }
          targetMap.get(lesson.id)!.items.push(mapped);
        });
      }
    });

    return {
      activeGroups: Array.from(activeMap.values()),
      archivedGroups: Array.from(archivedMap.values()),
      allItems,
      activeItems,
      archivedItems,
      isEmpty: passedLessons.length === 0 || allItems.length === 0,
    };
  }, [passedLessons, passedTests, isSharedMode, targetId]);
};