import { useMemo } from 'react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { contentConfig, homeworksConfig, type HomeworkConfig } from '@/contentConfig';

export interface MappedHomework extends HomeworkConfig {
  lessonId: string;
  lessonTitle: string;
}

export interface HomeworkGroup {
  lessonId: string;
  lessonTitle: string;
  items: MappedHomework[];
}

export const useHomeworksData = () => {
  const passedLessons = useProgressStore((s) => s.passedLessons);
  const passedHomeworks = useProgressStore((s) => s.passedHomeworks);

  return useMemo(() => {
    const activeMap = new Map<string, HomeworkGroup>();
    const archivedMap = new Map<string, HomeworkGroup>();
    const all: MappedHomework[] = [];
    const active: MappedHomework[] = [];
    const archived: MappedHomework[] = [];

    // Идем по дереву уроков (сохраняя правильный порядок)
    contentConfig.forEach((lesson) => {
      // Берем домашки только из пройденных лекций
      if (passedLessons.includes(lesson.id) && lesson.linkedHomeworks.length > 0) {
        lesson.linkedHomeworks.forEach((hwId) => {
          // Ищем метаданные в едином хранилище
          const configData = homeworksConfig[hwId];
          if (!configData) {
            console.warn(
              `[Content] Домашка ${hwId} указана в уроке, но не найдена в homeworksConfig`,
            );
            return;
          }

          const isArchived = passedHomeworks.includes(hwId);
          const mapped: MappedHomework = {
            ...configData,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          };

          all.push(mapped);

          const targetMap = isArchived ? archivedMap : activeMap;
          const targetList = isArchived ? archived : active;

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
      allItems: all,
      activeItems: active,
      archivedItems: archived,
      // Страница пуста, если не пройдено ни одного урока, ИЛИ если пройдены уроки без домашек (например, Введение)
      isEmpty: passedLessons.length === 0 || all.length === 0,
    };
  }, [passedLessons, passedHomeworks]);
};
