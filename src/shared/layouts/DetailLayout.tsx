import { ArrowUUpLeft } from '@phosphor-icons/react';
import { cn } from '@/app/utils/cn';
import type { ReactNode, Ref } from 'react';

export interface DetailLayoutProps {
  listContent: ReactNode;
  detailContent: ReactNode;
  isMobileDetailOpen: boolean;
  onBackClick: () => void;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  listRef?: Ref<HTMLDivElement>;
  detailRef?: Ref<HTMLDivElement>; 
}

export const DetailLayout: React.FC<DetailLayoutProps> = ({
  listContent,
  detailContent,
  isMobileDetailOpen,
  onBackClick,
  isEmpty,
  emptyState,
  listRef,
  detailRef, 
}) => {
  if (isEmpty && emptyState) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
        {emptyState}
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden font-sans">
      {/* ЛЕВАЯ КОЛОНКА (СПИСОК) */}
      <div
        className={cn(
          'flex h-full w-full flex-col border-text/18 md:w-[360px] md:border-r-[3px] lg:w-[420px]',
          isMobileDetailOpen ? 'hidden md:flex' : 'flex',
        )}
      >
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-8 pb-[50vh] ">
          {listContent}
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА (КОНТЕНТ) */}
      <div
        className={cn(
          'fixed inset-0 z-[100] flex h-full flex-col bg-background md:static md:z-auto md:flex-1',
          isMobileDetailOpen
            ? 'animate-in slide-in-from-right-8 flex duration-300'
            : 'hidden md:flex',
        )}
      >
        <div
          className="flex shrink-0 items-center bg-background px-4 pb-2 md:hidden"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}
        >
          <button
            className="flex items-center justify-center p-2 text-text/40 transition-colors hover:text-text"
            onClick={onBackClick}
          >
            <ArrowUUpLeft size={32} weight="light" />
          </button>
        </div>

        <div
          ref={detailRef}
          className="flex flex-1 flex-col overflow-y-auto px-6 pt-4 pb-[50vh] md:px-16 md:pt-16"
        >
          {detailContent}
        </div>
      </div>
    </div>
  );
};
