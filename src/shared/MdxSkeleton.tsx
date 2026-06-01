import { motion } from 'framer-motion';

export const MdxSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-full animate-pulse space-y-8"
    >
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-[95%] rounded bg-surface" />
        <div className="h-4 w-[90%] rounded bg-surface" />
        <div className="h-4 w-[60%] rounded bg-surface" />
      </div>
      <div className="mt-10 h-6 w-1/3 rounded-md bg-surface" />
      <div className="space-y-3 pt-4">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-[85%] rounded bg-surface" />
        <div className="h-4 w-[40%] rounded bg-surface" />
      </div>
      <div className="space-y-3 pt-4">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-[85%] rounded bg-surface" />
        <div className="h-4 w-[40%] rounded bg-surface" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-[95%] rounded bg-surface" />
        <div className="h-4 w-[90%] rounded bg-surface" />
        <div className="h-4 w-[60%] rounded bg-surface" />
      </div>
      <div className="mt-10 h-6 w-1/3 rounded-md bg-surface" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-[95%] rounded bg-surface" />
        <div className="h-4 w-[90%] rounded bg-surface" />
        <div className="h-4 w-[60%] rounded bg-surface" />
      </div>
      <div className="space-y-3 pt-4">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-[85%] rounded bg-surface" />
        <div className="h-4 w-[40%] rounded bg-surface" />
      </div>
      <div className="space-y-3 pt-4">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-[85%] rounded bg-surface" />
        <div className="h-4 w-[40%] rounded bg-surface" />
      </div>
    </motion.div>
  );
};
