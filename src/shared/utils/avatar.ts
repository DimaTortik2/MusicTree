
export const getAvatarColor = (identifier: string): string => {
  if (!identifier) return 'var(--avatar-5)'; // дефолтный синий
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 7; // У нас 7 цветов в CSS
  return `var(--avatar-${index + 1})`;
};

// Вытягиваем первую букву
export const getInitial = (name: string): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};
