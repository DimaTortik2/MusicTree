import { useMemo } from "react";
import { type ChainConfig, chainsConfig, contentConfig } from "@/contentConfig";
import { useCurrentProgress } from "@/app/hooks/useCurrentProgress";

export interface MappedChain extends ChainConfig {
  lessonId: string;
  lessonTitle: string;
}

export const useChainsData = () => {
  const { passedLessons } = useCurrentProgress();

  return useMemo(() => {
    // 1. Быстро собираем ID всех разблокированных звеньев и информацию об их уроках.
    const unlockedChainIds = new Set<string>();
    const chainToLessonMap = new Map<
      string,
      { lessonId: string; lessonTitle: string }
    >();

    contentConfig.forEach((lesson) => {
      if (passedLessons.includes(lesson.id) && lesson.linkedChains) {
        lesson.linkedChains.forEach((chainId) => {
          unlockedChainIds.add(chainId);
          chainToLessonMap.set(chainId, {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          });
        });
      }
    });

    // 2. Проходимся по мастер-массиву chainsConfig.
    // Благодаря этому порядок в цепи всегда будет таким, каким ты его задал в массиве chainsConfig.
    // Если какое-то звено посередине еще заблокировано, оно просто пропустится.
    const activeChains: MappedChain[] = chainsConfig
      .filter((chain) => unlockedChainIds.has(chain.id))
      .map((chain) => {
        const lessonInfo = chainToLessonMap.get(chain.id);
        return {
          ...chain,
          lessonId: lessonInfo?.lessonId ?? "",
          lessonTitle: lessonInfo?.lessonTitle ?? "",
        };
      });

    return {
      chains: activeChains,
      isEmpty: activeChains.length === 0,
    };
  }, [passedLessons]);
};
