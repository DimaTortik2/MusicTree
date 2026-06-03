import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/app/utils/cn';
import {
  X,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsInSimple,
} from '@phosphor-icons/react';
import { motion, AnimatePresence, useMotionValue, animate as framerAnimate } from 'framer-motion';

interface MdxImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export const MdxImage: React.FC<MdxImageProps> = ({ src, alt, className, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Реф для контейнера и управление координатами перетаскивания
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Проверяем, является ли картинка GIF-кой (работает для строк-путей)
  const isGif = typeof src === 'string' && src.toLowerCase().endsWith('.gif');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Блокируем скролл и слушаем Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Плавный возврат картинки точно в центр
  const resetPosition = () => {
    framerAnimate(x, 0, { type: 'spring', damping: 25, stiffness: 250 });
    framerAnimate(y, 0, { type: 'spring', damping: 25, stiffness: 250 });
  };

  const handleClose = () => {
    setIsOpen(false);
    // Когда модалка исчезает, сбрасываем всё, чтобы при следующем открытии было ровно
    setTimeout(() => {
      setZoomLevel(1);
      x.set(0);
      y.set(0);
    }, 200);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      // Если вернулись к 1x, автоматически центрируем картинку
      if (newZoom === 1) resetPosition();
      return newZoom;
    });
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    resetPosition();
  };

  return (
    <>
      {/* --- МАЛЕНЬКАЯ КАРТИНКА В ТЕКСТЕ ЛЕКЦИИ --- */}
      <figure className="my-6 flex flex-col items-start gap-2">
        <div className="relative w-full max-w-lg">
          <img
            src={src}
            alt={alt}
            onClick={() => setIsOpen(true)}
            // Отключаем lazy-loading для GIF, чтобы они не фризились при скролле
            loading={isGif ? undefined : 'lazy'}
            className={cn(
              'h-auto w-full cursor-zoom-in rounded-[16px] object-contain shadow-sm transition-opacity hover:opacity-80',
              'border border-surface bg-surface/30',
              className,
            )}
            {...props}
          />
        </div>

        {alt && (
          <figcaption className="max-w-lg px-2 text-start text-sm text-text/50">{alt}</figcaption>
        )}
      </figure>

      {/* --- УВЕЛИЧЕННАЯ КАРТИНКА С ЗУМОМ И ПАННИНГОМ --- */}
      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
                onClick={handleClose}
              >
                {/* Кнопка закрытия */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15, delay: 0.05 }}
                  className="absolute top-4 right-4 z-50 flex size-12 cursor-pointer items-center justify-center rounded-full bg-surface text-text/70 transition-all hover:bg-surface/80 hover:text-text active:scale-95 sm:top-8 sm:right-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                >
                  <X size={24} weight="bold" />
                </motion.button>

                {/* Контейнер для перетаскивания */}
                <div
                  ref={constraintsRef}
                  className="flex h-full w-full items-center justify-center overflow-hidden"
                >
                  <motion.img
                    src={src}
                    alt={alt}
                    // Привязываем физические координаты к картинке
                    style={{ x, y }}
                    initial={{ scale: 0.93, opacity: 0 }}
                    animate={{ scale: zoomLevel, opacity: 1 }}
                    exit={{ scale: 0.93, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    className={cn(
                      'max-h-[85vh] max-w-full rounded-[24px] object-contain shadow-2xl',
                      zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                    )}
                    // Перетаскивать можно только при зуме
                    drag={zoomLevel > 1}
                    dragConstraints={constraintsRef}
                    dragElastic={0.1}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Панель управления зумом */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="absolute bottom-8 z-50 flex items-center gap-2 rounded-full border border-white/5 bg-surface/80 p-2 shadow-lg backdrop-blur-xl sm:bottom-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-transparent text-text transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
                  >
                    <MagnifyingGlassMinus size={20} weight="bold" />
                  </button>

                  <div className="mx-1 h-6 w-px bg-white/10" />

                  <button
                    onClick={handleResetZoom}
                    disabled={zoomLevel === 1}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-transparent text-text transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
                  >
                    <ArrowsInSimple size={20} weight="bold" />
                  </button>

                  <div className="mx-1 h-6 w-px bg-white/10" />

                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 3}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-transparent text-text transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
                  >
                    <MagnifyingGlassPlus size={20} weight="bold" />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};
