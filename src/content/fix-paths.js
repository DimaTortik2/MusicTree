import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Регулярка ищет теги <audio ...></audio> или самозакрывающиеся <audio ... />
// Игнорируем <Audio> (с большой буквы), ищем только те, что нужно исправить.
const regex = /<audio\s+([^>]*?)>\s*(?:<\/audio>)?/g;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // Защита: не лезем в системные папки, если скрипт запущен из корня проекта
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
      processDirectory(fullPath);
    } else if (file.endsWith('.mdx') || file.endsWith('.md')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let hasChanges = false;

      const newContent = content.replace(regex, (match, attrs) => {
        hasChanges = true;

        // Очищаем атрибуты. Если тег был <audio src="..." />,
        // в конце мог остаться слэш. Аккуратно его отрезаем.
        let cleanAttrs = attrs.trim();
        if (cleanAttrs.endsWith('/')) {
          cleanAttrs = cleanAttrs.slice(0, -1).trim();
        }

        // Собираем новый тег компонента с большой буквы
        return `<Audio ${cleanAttrs} />`;
      });

      // Перезаписываем файл, только если в нём реально были изменения
      if (hasChanges && newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`✅ Исправлен аудио-плеер в: ${file}`);
      }
    }
  }
}

console.log('🚀 Начинаем поиск тегов <audio>...');

// Если скрипт лежит прямо в папке с проектом,
// можно явно указать путь до лекций, чтобы он не искал по всем папкам.
// Если он лежит рядом с лекциями, оставь __dirname.
const targetDir = path.join(__dirname, 'src', 'content');
// Если папки src/content нет относительно скрипта,
// поменяй targetDir на __dirname или другой нужный путь.

if (fs.existsSync(targetDir)) {
  processDirectory(targetDir);
} else {
  // Фолбэк: если папка не найдена, запускаем там же, где лежит скрипт
  processDirectory(__dirname);
}

console.log('🎉 Готово! Все <audio> заменены на <Audio />.');
