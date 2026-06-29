// Конвертация буфера в base64
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Конвертация base64 обратно в буфер
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Генерация уникального ключа шифрования (AES-GCM) на основе ID совместного дерева
async function getTreeKey(treeId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Используем treeId как базу для пароля. Дополняем до 32 символов (требование алгоритма)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(treeId.padEnd(32, '0').slice(0, 32)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('music-tree-secure-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ЗАШИФРОВАТЬ сообщение
export async function encryptMessage(text: string, treeId: string): Promise<string> {
  const key = await getTreeKey(treeId);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Вектор инициализации (12 байт для AES-GCM)
  const encodedText = new TextEncoder().encode(text);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedText);

  // Возвращаем в формате IV.CIPHERTEXT
  return `${bufferToBase64(iv.buffer)}.${bufferToBase64(ciphertext)}`;
}

// РАСШИФРОВАТЬ сообщение
export async function decryptMessage(encryptedBlob: string, treeId: string): Promise<string> {
  try {
    const parts = encryptedBlob.split('.');

    // Если сообщение старое и не было зашифровано (нет точки-разделителя) — возвращаем как есть
    if (parts.length !== 2) return encryptedBlob;

    const [ivB64, cipherB64] = parts;
    const key = await getTreeKey(treeId);

    const iv = new Uint8Array(base64ToBuffer(ivB64));
    const ciphertext = base64ToBuffer(cipherB64);

    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    console.error('Ошибка дешифровки сообщения:', e);
    return '[Сообщение не может быть расшифровано]';
  }
}
