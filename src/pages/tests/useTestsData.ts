// src/app/pages/tests/useTestsData.ts
import { useMemo } from 'react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { contentConfig } from '@/contentConfig';
import { testsData, type TestConfig } from '@/content/testsData';

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

export const useTestsData = () => {
  const passedLessons = useProgressStore((s) => s.passedLessons);
  const passedTests = useProgressStore((s) => s.passedTests);

  return useMemo(() => {
    const activeMap = new Map<string, TestGroup>();
    const archivedMap = new Map<string, TestGroup>();
    const allItems: MappedTest[] = [];
    const activeItems: MappedTest[] = [];
    const archivedItems: MappedTest[] = [];

    // Идем по урокам в порядке их конфига
    contentConfig.forEach((lesson) => {
      // Показываем тесты только из пройденных уроков
      if (passedLessons.includes(lesson.id) && lesson.linkedTests.length > 0) {
        lesson.linkedTests.forEach((testId) => {
          const testContent = testsData[testId];
          if (!testContent) return;

          const testResult = passedTests[testId];
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
  }, [passedLessons, passedTests]);
};
