import { TABS_INFO } from '@/shared/config/tabsConfig';
import { ArrowArcLeft, List as DragIcon, Plus, Minus } from '@phosphor-icons/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { useProgressStore } from '@/app/store/useProgressStore';
import { ControlButton } from '@/shared/buttons/ControlButton';
import { toast } from '@/app/utils/toast';
import { useMemo } from 'react';

function SortableTabItem({
  id,
  isActive,
  onMove,
}: {
  id: string;
  isActive: boolean;
  onMove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const info = TABS_INFO[id];

  // Защита: если вкладки больше нет в конфиге, не ломаем рендер
  if (!info) return null;

  const isUnremovable = isActive && (id === 'tree' || id === 'lesson');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-4 bg-background py-3"
    >
      {/* Кнопка Добавить/Удалить */}
      <button onClick={onMove} disabled={isUnremovable} className="shrink-0 outline-none">
        {isActive ? (
          <Minus size={24} className={isUnremovable ? 'text-white/40' : 'text-primary'} />
        ) : (
          <Plus size={24} className="text-access" />
        )}
      </button>

      {/* Иконка вкладки */}
      <div className="flex w-7 shrink-0 items-center justify-center">
        {id === 'piano' ? (
          <ControlButton
            icon={<info.icon size={22} weight="fill" />}
            className="pointer-events-none"
            innerClassName="p-1 bg-text/70"
            tabIndex={-1}
          />
        ) : (
          <info.icon size={28} className="text-text/80" />
        )}
      </div>

      {/* Текст */}
      <div className="flex-1">
        <h4 className="text-[16px] font-medium text-text">{info.title}</h4>
        <p className="mt-0.5 text-[12px] leading-tight text-white/40">{info.desc}</p>
      </div>

      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 touch-none text-white/40 outline-none"
      >
        <DragIcon size={24} />
      </button>
    </div>
  );
}

export function TabBarCustomization({ onClose }: { onClose: () => void }) {
  const { activeTabs, inactiveTabs, setActiveTabs, setInactiveTabs } = useProgressStore();

  // Фильтруем вкладки на лету. Если в сторе остался мусор или удаленные ID (типа exam),
  // интерфейс их просто проигнорирует и ничего не упадет.
  const validActiveTabs = useMemo(() => {
    return activeTabs.filter((id) => id in TABS_INFO);
  }, [activeTabs]);

  const validInactiveTabs = useMemo(() => {
    return inactiveTabs.filter((id) => id in TABS_INFO);
  }, [inactiveTabs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEndActive = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = validActiveTabs.indexOf(active.id);
      const newIndex = validActiveTabs.indexOf(over.id);
      setActiveTabs(arrayMove(validActiveTabs, oldIndex, newIndex));
    }
  };

  const handleDragEndInactive = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = validInactiveTabs.indexOf(active.id);
      const newIndex = validInactiveTabs.indexOf(over.id);
      setInactiveTabs(arrayMove(validInactiveTabs, oldIndex, newIndex));
    }
  };

  const handleRemove = (id: string) => {
    if (id === 'tree' || id === 'lesson') return;
    setActiveTabs(validActiveTabs.filter((t) => t !== id));
    setInactiveTabs([id, ...validInactiveTabs]);
  };

  const handleAdd = (id: string) => {
    if (validActiveTabs.length >= 5) {
      toast.error('Нельзя добавить больше 5 вкладок', { toastId: 'max-5-tabbar' });
      return;
    }
    setInactiveTabs(validInactiveTabs.filter((t) => t !== id));
    setActiveTabs([...validActiveTabs, id]);
  };

  const dragModifiers = [restrictToVerticalAxis, restrictToParentElement];

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-background px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[50vh]">
      <div className="mb-6 flex items-center">
        <button
          onClick={onClose}
          className="-ml-2 p-2 text-white/40 transition-colors outline-none active:text-text"
        >
          <ArrowArcLeft size={28} />
        </button>
      </div>

      <div className="mb-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndActive}
          modifiers={dragModifiers}
        >
          <div className="relative flex flex-col">
            <SortableContext items={validActiveTabs} strategy={verticalListSortingStrategy}>
              {validActiveTabs.map((id) => (
                <SortableTabItem key={id} id={id} isActive={true} onMove={() => handleRemove(id)} />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      <div className="mt-4">
        <h3 className="mb-4 text-sm text-white/40">Неактивные вкладки</h3>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndInactive}
          modifiers={dragModifiers}
        >
          <div className="relative flex flex-col">
            <SortableContext items={validInactiveTabs} strategy={verticalListSortingStrategy}>
              {validInactiveTabs.map((id) => (
                <SortableTabItem key={id} id={id} isActive={false} onMove={() => handleAdd(id)} />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>
    </div>
  );
}
