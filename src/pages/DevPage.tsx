import { VisualPiano } from '@/shared/piano/VisualPiano';

interface DevPageProps {
  className?: string;
}

export const DevPage = ({ className }: DevPageProps) => {
  return (
    <div className={className}>
      <VisualPiano />
    </div>
  );
};
