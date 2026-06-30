import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/lib/supabase";
import { useSharedProgressStore } from "@/app/store/useSharedProgressStore";
import { useAppModeStore } from "@/app/store/useAppModeStore";
import { toast } from "@/app/utils/toast";

// Вырезаем локальные ключи
const stripNav = (fullState: any) => {
  if (!fullState) return {};
  const { currentLesson, lastUncompletedLesson, lessonScrollPositions, ...stateToSave } = fullState;
  return stateToSave;
};

// 🔥 Спец-функция: собирает JSON всегда с одинаковым порядком ключей. 
// Исключает баг, когда база возвращает ключи задом наперед и происходит бесконечный цикл "пересохранений".
const stableStringify = (obj: any): string => {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  
  const keys = Object.keys(obj).sort();
  let res = "{";
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) res += ",";
    res += JSON.stringify(keys[i]) + ":" + stableStringify(obj[keys[i]]);
  }
  res += "}";
  return res;
};

// --- УМНЫЙ МЕРЖ ---
const mergeArrays = (baseArr: string[] = [], localArr: string[] = [], dbArr: string[] = []): string[] => {
  const removedLocally = baseArr.filter((id) => !localArr.includes(id));
  const addedLocally = localArr.filter((id) => !baseArr.includes(id));
  
  const mergedSet = new Set<string>(dbArr);
  addedLocally.forEach((id) => mergedSet.add(id));
  removedLocally.forEach((id) => mergedSet.delete(id));
  
  return Array.from(mergedSet);
};

const mergeObjects = (baseObj: Record<string, any> = {}, localObj: Record<string, any> = {}, dbObj: Record<string, any> = {}) => {
  const result = { ...dbObj };
  for (const key of Object.keys(baseObj)) {
    if (!(key in localObj)) delete result[key];
  }
  for (const [key, val] of Object.entries(localObj)) {
    if (baseObj[key] !== val) result[key] = val;
  }
  return result;
};

const performSmartMerge = (baseState: any, localState: any, dbState: any) => {
  const mergedPassedLessons = mergeArrays(baseState.passedLessons, localState.passedLessons, dbState.passedLessons);
  const mergedPassedHomeworks = mergeArrays(baseState.passedHomeworks, localState.passedHomeworks, dbState.passedHomeworks);
  const mergedUnlockedChains = mergeArrays(baseState.unlockedChains, localState.unlockedChains, dbState.unlockedChains);

  const mergedHalfPassedLessons = mergeObjects(baseState.halfPassedLessons, localState.halfPassedLessons, dbState.halfPassedLessons);
  const mergedHalfPassedHomeworks = mergeObjects(baseState.halfPassedHomeworks, localState.halfPassedHomeworks, dbState.halfPassedHomeworks);
  const mergedPassedTests = mergeObjects(baseState.passedTests, localState.passedTests, dbState.passedTests);

  mergedPassedLessons.forEach((id: string) => delete mergedHalfPassedLessons[id]);
  mergedPassedHomeworks.forEach((id: string) => delete mergedHalfPassedHomeworks[id]);

  return {
    ...dbState, 
    passedLessons: mergedPassedLessons,
    passedHomeworks: mergedPassedHomeworks,
    unlockedChains: mergedUnlockedChains,
    halfPassedLessons: mergedHalfPassedLessons,
    halfPassedHomeworks: mergedHalfPassedHomeworks,
    passedTests: mergedPassedTests,
  };
};

export const useSharedTreeSync = () => {
  const { sharedTreeId, exitSharedMode } = useAppModeStore();
  const navigate = useNavigate();
  
  const lastSyncedStateStr = useRef<string>("");
  const pendingSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);

  const exitRef = useRef(exitSharedMode);
  const navRef = useRef(navigate);

  useEffect(() => {
    exitRef.current = exitSharedMode;
    navRef.current = navigate;
  }, [exitSharedMode, navigate]);

  useEffect(() => {
    if (!sharedTreeId) return;

    let channel: any;

    // 1. ПОДПИСЫВАЕМСЯ МОМЕНТАЛЬНО. Никакие клики не пропадут!
    const unsubStore = useSharedProgressStore.subscribe((state) => {
      if (!isInitialized.current) return;

      const latestState = stripNav(state);
      const currentStr = stableStringify(latestState);
      
      if (currentStr === lastSyncedStateStr.current) {
        if (pendingSaveTimeout.current) clearTimeout(pendingSaveTimeout.current);
        return;
      }

      if (pendingSaveTimeout.current) clearTimeout(pendingSaveTimeout.current);
      
      pendingSaveTimeout.current = setTimeout(async () => {
        const finalStateToSave = stripNav(useSharedProgressStore.getState());
        const finalStr = stableStringify(finalStateToSave);
        
        if (finalStr === lastSyncedStateStr.current) return;
        
        lastSyncedStateStr.current = finalStr;

        await supabase
          .from("shared_trees")
          .update({
            progress_state: finalStateToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sharedTreeId);
      }, 800); // 0.8s задержка
    });

    // 2. ИНИЦИАЛИЗАЦИЯ ИЗ БАЗЫ
    const initFetch = async () => {
      const baseStateBeforeFetch = stripNav(useSharedProgressStore.getState());

      const { data } = await supabase
        .from("shared_trees")
        .select("progress_state")
        .eq("id", sharedTreeId)
        .single();

      if (data && data.progress_state) {
        const currentLocalState = useSharedProgressStore.getState();
        const mergedCore = performSmartMerge(
          baseStateBeforeFetch, 
          stripNav(currentLocalState), 
          data.progress_state
        );

        lastSyncedStateStr.current = stableStringify(data.progress_state);
        isInitialized.current = true;

        // 🔥 ВАЖНО: сохраняем локальную навигацию при апдейте, чтобы интерфейс не ломался
        useSharedProgressStore.setState({
          ...currentLocalState,
          ...mergedCore
        });
      } else {
        lastSyncedStateStr.current = stableStringify(stripNav(useSharedProgressStore.getState()));
        isInitialized.current = true;
      }
    };

    initFetch();

    // 3. ПРИЁМ ОБНОВЛЕНИЙ ОТ ДРУГА
    channel = supabase
      .channel(`shared_tree_${sharedTreeId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shared_trees", filter: `id=eq.${sharedTreeId}` },
        (payload) => {
          if (payload.new && payload.new.progress_state) {
            const incomingDbState = payload.new.progress_state;
            const incomingStr = stableStringify(incomingDbState);

            if (incomingStr === lastSyncedStateStr.current) return;

            const baseState = lastSyncedStateStr.current ? JSON.parse(lastSyncedStateStr.current) : {};
            const localState = useSharedProgressStore.getState();

            const mergedCore = performSmartMerge(baseState, stripNav(localState), incomingDbState);

            lastSyncedStateStr.current = incomingStr; 
            
            useSharedProgressStore.setState({
              ...localState,
              ...mergedCore
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "shared_trees", filter: `id=eq.${sharedTreeId}` },
        () => {
          exitRef.current();
          navRef.current("/app/tree");
          toast.info("Совместное дерево удалено вашим другом");
        }
      )
      .subscribe();

    return () => {
      unsubStore();
      if (pendingSaveTimeout.current) clearTimeout(pendingSaveTimeout.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [sharedTreeId]);
};