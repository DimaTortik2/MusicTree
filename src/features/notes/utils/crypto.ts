// Используем Web Crypto API. Быстро, безопасно, не требует npm-пакетов.
const SECRET_PEPPER = 'music-tree-secure-pepper-2026';

const getCryptoKey = async (treeId: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(treeId + SECRET_PEPPER),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('music-tree-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const encryptNoteText = async (text: string, treeId: string): Promise<string> => {
  try {
    const key = await getCryptoKey(treeId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(text),
    );
    // Склеиваем IV и зашифрованные данные, переводим в base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error('Ошибка шифрования', e);
    return text; // Фолбэк
  }
};

export const decryptNoteText = async (encryptedBase64: string, treeId: string): Promise<string> => {
  try {
    // Если текст явно не похож на base64 с IV (например, старые нешифрованные заметки)
    if (!encryptedBase64.match(/^[a-zA-Z0-9+/]+={0,2}$/) || encryptedBase64.length < 20) {
      return encryptedBase64;
    }
    const combined = new Uint8Array(
      atob(encryptedBase64).split('').map((c) => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await getCryptoKey(treeId);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    // Если расшифровать не вышло (например, это был обычный текст), возвращаем как есть
    return encryptedBase64;
  }
};