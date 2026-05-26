interface PinkWaveProps {
  className?: string;
}

export const PinkWave = ({ className }: PinkWaveProps) => (
  <svg
    viewBox="0 0 1728 784" // Новый viewBox под твои пропорции 1728x784
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M314.5 344.625C182.5 242.625 94.5 407.53 78 432.03L-1 547.03C110.833 421.363 95.0368 377.84 229.5 400.125C588.5 459.625 720.496 1061.39 1114.5 628.125C1551 148.125 1728.5 73.0907 1728.5 2.52943C1728.5 -45.4707 1155.5 605.125 923.5 642.625C691.5 680.125 446.5 446.625 314.5 344.625Z"
      fill="var(--color-primary)" // Привязка к CSS-переменной темы
    />
  </svg>
);

