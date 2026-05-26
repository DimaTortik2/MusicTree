import { useTheme } from '@/app/providers/ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/20 bg-surface px-4 py-2 text-text transition-all hover:bg-surface/80"
    >
      {/* React среагирует на изменение стейта и перерисует иконку и текст */}
      {theme === 'dark' ? <span>Светлая тема</span> : <span>Темная тема</span>}
    </button>
  );
}
