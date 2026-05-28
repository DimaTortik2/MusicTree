import { OnlyVisualPiano } from '@/shared/piano/OnlyVisualPiano';

interface DevPageProps {
  className?: string;
}

export const DevPage = ({ className }: DevPageProps) => {
  return (
    <div className={className}>
      <OnlyVisualPiano />
    </div>
  );
};
