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

export const getOAuthLqipUrl = (url?: string | null): string | null => {
  if (!url) return null;

  try {
    // Для GitHub (добавляем или меняем параметр ?s=16)
    if (url.includes('githubusercontent.com')) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('s', '16');
      return urlObj.toString();
    }

    // Для Google (размер задается через =s[число]-c в конце ссылки)
    if (url.includes('googleusercontent.com')) {
      if (url.includes('=')) {
        // Заменяем текущий размер на =s16-c
        return url.replace(/=s\d+(-[a-zA-Z]+)?/, '=s16-c');
      } else {
        return `${url}=s16-c`;
      }
    }
  } catch (e) {
    // Если URL кривой, просто игнорируем
    return null;
  }

  return null;
};