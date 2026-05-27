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
import { toast } from 'react-toastify';
import { useProgressStore } from '@/app/store/useProgressStore';

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
          <div className="flex items-center justify-center rounded-md bg-text/70 p-1 text-surface">
            <info.icon size={22} weight="fill" />
          </div>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEndActive = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = activeTabs.indexOf(active.id);
      const newIndex = activeTabs.indexOf(over.id);
      setActiveTabs(arrayMove(activeTabs, oldIndex, newIndex));
    }
  };

  const handleDragEndInactive = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = inactiveTabs.indexOf(active.id);
      const newIndex = inactiveTabs.indexOf(over.id);
      setInactiveTabs(arrayMove(inactiveTabs, oldIndex, newIndex));
    }
  };

  const handleRemove = (id: string) => {
    if (id === 'tree' || id === 'lesson') return;
    setActiveTabs(activeTabs.filter((t) => t !== id));
    setInactiveTabs([id, ...inactiveTabs]);
  };

  const handleAdd = (id: string) => {
    if (activeTabs.length >= 5) {
      toast.error('Нельзя добавить больше 5 вкладок. Уберите одну из активных', { theme: 'dark' });
      return;
    }
    setInactiveTabs(inactiveTabs.filter((t) => t !== id));
    setActiveTabs([...activeTabs, id]);
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
            <SortableContext items={activeTabs} strategy={verticalListSortingStrategy}>
              {activeTabs.map((id) => (
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
            <SortableContext items={inactiveTabs} strategy={verticalListSortingStrategy}>
              {inactiveTabs.map((id) => (
                <SortableTabItem key={id} id={id} isActive={false} onMove={() => handleAdd(id)} />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>
    </div>
  );
}
