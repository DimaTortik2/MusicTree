import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GitFork } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { cn } from '@/app/utils/cn';
import { DetailLayout } from '@/shared/layouts/DetailLayout';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import { Modal } from '@/shared/Modal';
import { useChainsData } from './useChainsData';
import { useRememberSelection } from '@/shared/hooks/useRememberSelection';
// ✨ Добавляем framer-motion
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { SharedNotesContainer } from '@/features/notes/ui/SharedNotesContainer';

const mdxFiles = import.meta.glob('/src/content/**/*.mdx');

const mdxComponentsCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const path in mdxFiles) {
  mdxComponentsCache[path] = React.lazy(
    mdxFiles[path] as () => Promise<{ default: React.ComponentType<any> }>,
  );
}

// ✨ Те же варианты затухания, что и на странице домашек
const contentTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.25, 0, 0.5, 1],
    },
  },
};

export const ChainsPage = () => {
  const navigate = useNavigate();
  const { chainId } = useParams();
  const data = useChainsData();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Скроллим MDX-контент наверх
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }

    // 2. Подкручиваем левый список к активному звену
    if (chainId) {
      const timer = setTimeout(() => {
        const item = document.getElementById(`chain-item-${chainId}`);
        if (item) {
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [chainId]);

  useEffect(() => {
    if (!data.isEmpty && data.chains.length > 0) {
      const isValidId = data.chains.some((c) => c.id === chainId);
      if (!chainId || !isValidId) {
        navigate(`/app/chains/${data.chains[0].id}`, { replace: true });
      }
    }
  }, [chainId, data, navigate]);

  const selectedChain = data.chains.find((c) => c.id === chainId);
  const LazyMdxContent = selectedChain ? mdxComponentsCache[selectedChain.mdxPath] : null;

  const handleSelect = (id: string) => {
    navigate(`/app/chains/${id}`);
    if (window.innerWidth < 768) setIsMobileOpen(true);
  };

  const getSavedId = useRememberSelection('music-tree-last-chain', chainId, (id) =>
    data.chains.some((c) => c.id === id),
  );

  useEffect(() => {
    if (!data.isEmpty && data.chains.length > 0) {
      const isValidId = data.chains.some((c) => c.id === chainId);
      if (!chainId || !isValidId) {
        const fallbackId = getSavedId() || data.chains[0].id;
        navigate(`/app/chains/${fallbackId}`, { replace: true });
      }
    }
  }, [chainId, data, navigate, getSavedId]);

  const EmptyState = (
    <Modal
      inline
      layout="horizontal"
      title="После прохождения первого урока эта страница пополнится первыми звеньями распевки"
      description="Они будут накапливаться здесь"
      icon={<GitFork className="size-8 sm:size-10" weight="regular" />}
      onIconClick={() => navigate('/app/tree', { replace: true })}
      iconContainerClassName="bg-primary"
    />
  );

  const ListContent = (
    <div className="flex w-full flex-col items-center px-2">
      {/* Стартовая линия сверху */}
      {data.chains.length > 0 && (
        <div className="h-16 w-[3px] bg-gradient-to-t from-text/20 to-transparent sm:h-20" />
      )}

      {data.chains.map((chain, index) => {
        const isSelected = chainId === chain.id;
        const Icon = chain.icon || GitFork;

        return (
          <React.Fragment key={chain.id}>
            <Button
              id={`chain-item-${chain.id}`}
              variant="outline"
              color="text"
              className={cn(
                '!h-auto !w-auto !p-4 transition-all duration-300 sm:!p-5',
                isSelected ? 'border-text opacity-100' : 'opacity-40 hover:opacity-70',
              )}
              onClick={() => handleSelect(chain.id)}
            >
              <Icon className="size-8 sm:size-10" weight="regular" />
            </Button>

            {/* Звено-соединитель снизу */}
            {index < data.chains.length - 1 && (
              <div className={cn('h-8 w-[3px] bg-text/20 transition-all duration-300 sm:h-10')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

 const DetailContent = (
   <AnimatePresence mode="wait">
     <motion.div
       key={chainId || 'empty'}
       initial="initial"
       animate="animate"
       exit="exit"
       variants={contentTransitionVariants}
       className="flex flex-1 flex-col"
     >
       {/* Обертка заметок берет на себя все стили текста */}
       <SharedNotesContainer
         contentId={chainId}
         className="prose max-w-none flex-1 text-[17px] leading-relaxed text-text prose-invert"
       >
         {LazyMdxContent ? (
           <Suspense fallback={<MdxSkeleton />}>
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, ease: 'easeOut' }}
             >
               <LazyMdxContent />
             </motion.div>
           </Suspense>
         ) : selectedChain ? (
           <div className="h-full py-4 font-medium text-primary">
             Файл не найден. Пожалуйста, создайте файл MDX по пути: {selectedChain.mdxPath}
           </div>
         ) : null}
       </SharedNotesContainer>
     </motion.div>
   </AnimatePresence>
 );

  return (
    <DetailLayout
      isEmpty={data.isEmpty}
      emptyState={EmptyState}
      isMobileDetailOpen={isMobileOpen}
      onBackClick={() => setIsMobileOpen(false)}
      listContent={ListContent}
      detailContent={DetailContent}
      listRef={listRef}
      detailRef={detailRef}
    />
  );
};
