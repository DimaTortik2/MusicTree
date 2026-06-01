export const formatShortcut = (code: string): string => {
  if (!code) return '';

  const isMac = typeof window !== 'undefined' && navigator.userAgent.toUpperCase().includes('MAC');

  // Твой оригинальный маппинг символов
  const symbolMap: Record<string, string> = {
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Backslash: '\\',
    Slash: '/',
    Comma: ',',
    Period: '.',
    Backquote: '`',
  };

  return code
    .split('+')
    .map((part) => {
      // 1. Очищаем префиксы Key и Digit
      let text = part.replace(/^Key/, '').replace(/^Digit/, '');

      // 2. Преобразуем технические названия клавиш в символы
      if (symbolMap[text]) {
        text = symbolMap[text];
      }

      // 3. Заменяем Alt на Mac
      if (text === 'Alt' && isMac) {
        return '⌥';
      }

      return text;
    })
    .join(isMac ? ' ' : ' + '); // На Mac "⌥ ]", на Windows "Alt + ]"
};
