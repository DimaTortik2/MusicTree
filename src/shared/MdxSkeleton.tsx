import { motion } from 'framer-motion';

// Универсальный переливающийся блок
const ShimmerBlock = ({ className }: { className?: string }) => (
  <motion.div
    animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
    className={`bg-gradient-to-r from-text/5 via-text/15 to-text/5 bg-[length:400%_100%] ${className}`}
  />
);

export const MdxSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-full space-y-8"
    >
      <div className="space-y-3">
        <ShimmerBlock className="h-4 w-full rounded" />
        <ShimmerBlock className="h-4 w-[95%] rounded" />
        <ShimmerBlock className="h-4 w-[90%] rounded" />
        <ShimmerBlock className="h-4 w-[60%] rounded" />
      </div>
      <ShimmerBlock className="mt-10 h-6 w-1/3 rounded-md" />

      <div className="space-y-3 pt-4">
        <ShimmerBlock className="h-4 w-full rounded" />
        <ShimmerBlock className="h-4 w-[85%] rounded" />
        <ShimmerBlock className="h-4 w-[40%] rounded" />
      </div>

      <div className="space-y-3 pt-4">
        <ShimmerBlock className="h-4 w-full rounded" />
        <ShimmerBlock className="h-4 w-[85%] rounded" />
        <ShimmerBlock className="h-4 w-[40%] rounded" />
      </div>

      <div className="space-y-3">
        <ShimmerBlock className="h-4 w-full rounded" />
        <ShimmerBlock className="h-4 w-[95%] rounded" />
        <ShimmerBlock className="h-4 w-[90%] rounded" />
        <ShimmerBlock className="h-4 w-[60%] rounded" />
      </div>
      <ShimmerBlock className="mt-10 h-6 w-1/3 rounded-md" />

      <div className="space-y-3">
        <ShimmerBlock className="h-4 w-full rounded" />
        <ShimmerBlock className="h-4 w-[95%] rounded" />
        <ShimmerBlock className="h-4 w-[90%] rounded" />
        <ShimmerBlock className="h-4 w-[60%] rounded" />
      </div>

      <div className="space-y-3 pt-4">
        <ShimmerBlock className="h-4 w-full rounded" />
        <ShimmerBlock className="h-4 w-[85%] rounded" />
        <ShimmerBlock className="h-4 w-[40%] rounded" />
      </div>

      <div className="space-y-3 pt-4">
        <ShimmerBlock className="h-4 w-full rounded" />
        <ShimmerBlock className="h-4 w-[85%] rounded" />
        <ShimmerBlock className="h-4 w-[40%] rounded" />
      </div>
    </motion.div>
  );
};
