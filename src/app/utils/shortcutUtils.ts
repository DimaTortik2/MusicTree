// Превращает KeyboardEvent в строку вида "Ctrl+Shift+KeyK"
export const encodeKeystroke = (e: KeyboardEvent): string | null => {
  // Если нажали ТОЛЬКО сам модификатор (без буквы), ждем дальше
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;

  const keys: string[] = [];

  // Объединяем Ctrl (Windows) и Cmd (Mac) в одно понятие "Ctrl" для универсальности
  if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
  if (e.altKey) keys.push('Alt');
  if (e.shiftKey) keys.push('Shift');

  keys.push(e.code);
  return keys.join('+');
};

// Красивое форматирование для UI: "Ctrl+Shift+KeyK" -> "Ctrl + Shift + K"
export const formatKeystroke = (encodedString: string) => {
  if (!encodedString) return '—';

  return encodedString
    .split('+')
    .map((part) => {
      let formatted = part.replace('Key', '').replace('Digit', '');
      if (formatted === 'Space') return 'Пробел';
      if (formatted === 'Escape') return 'ESC';
      if (formatted === 'Backspace') return '⌫ Backspace';
      if (formatted === 'Enter') return '⏎ Enter';
      if (formatted === 'ArrowUp') return '↑';
      if (formatted === 'ArrowDown') return '↓';
      if (formatted === 'ArrowLeft') return '←';
      if (formatted === 'ArrowRight') return '→';
      return formatted;
    })
    .join(' + ');
};
