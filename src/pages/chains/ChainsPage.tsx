import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GitFork } from '@phosphor-icons/react'; // Поменяли иконку для модалки и фоллбэка
import { Button } from '@/shared/Button';
import { cn } from '@/app/utils/cn';
import { DetailLayout } from '@/shared/layouts/DetailLayout';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import { Modal } from '@/shared/Modal';
import { useChainsData } from './useChainsData';
import { useRememberSelection } from '@/shared/hooks/useRememberSelection';

const mdxFiles = import.meta.glob('/src/content/*.mdx');

const mdxComponentsCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const path in mdxFiles) {
  mdxComponentsCache[path] = React.lazy(
    mdxFiles[path] as () => Promise<{ default: React.ComponentType<any> }>,
  );
}

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
     }, 50); // Небольшая задержка для точного рендера DOM
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
        // Берем сохраненный ID, либо фоллбечимся на дефолтный (самый первый)
        const fallbackId = getSavedId() || data.chains[0].id;
        navigate(`/app/chains/${fallbackId}`, { replace: true });
      }
    }
  }, [chainId, data, navigate, getSavedId]);

  // Точная реализация модалки, как ты просил
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
      {/* Стартовая линия сверху (цепь "свисает" сверху). Градиент дает эффект растворения */}
      {data.chains.length > 0 && (
        <div className="h-16 w-[3px] bg-gradient-to-t from-text/20 to-transparent sm:h-20" />
      )}

      {data.chains.map((chain, index) => {
        const isSelected = chainId === chain.id;

        // Берем иконку из конфига или ставим заглушку, чтобы ничего не ломалось
        const Icon = chain.icon || GitFork;

        return (
          <React.Fragment key={chain.id}>
            <Button
              id={`chain-item-${chain.id}`}
              variant="outline" // Все элементы на макете outline
              color="text"
              className={cn(
                // Убираем лишние паддинги, делаем квадрат с иконкой
                '!h-auto !w-auto !p-4 transition-all duration-300 sm:!p-5',
                // Выделяем активный элемент яркостью, а не заливкой
                isSelected ? 'border-text opacity-100' : 'opacity-40 hover:opacity-70',
              )}
              onClick={() => handleSelect(chain.id)}
            >
              <Icon className="size-8 sm:size-10" weight="regular" />
            </Button>

            {/* Звено-соединитель снизу (рендерим всем, кроме последнего) */}
            {index < data.chains.length - 1 && (
              <div
                className={cn(
                  'h-8 w-[3px] transition-all duration-300 sm:h-10',
                  // Линия между элементами
                  'bg-text/20',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const DetailContent = (
    <div key={chainId} className="flex flex-1 flex-col">
      <div className="prose prose-invert max-w-none flex-1 text-[17px] leading-relaxed text-text">
        {LazyMdxContent ? (
          <Suspense fallback={<MdxSkeleton />}>
            <LazyMdxContent />
          </Suspense>
        ) : selectedChain ? (
          <div className="h-full py-4 font-medium text-primary">
            Файл не найден. Пожалуйста, создайте файл MDX по пути: {selectedChain.mdxPath}
          </div>
        ) : null}
      </div>
    </div>
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
};;
