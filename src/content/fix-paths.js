import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Регулярка для открывающих тегов: ищет "<img", только если дальше идет пробел, "/" или ">"
const openRegex = /<img(?=\s|>|\/)/g;
// Регулярка для закрывающих тегов (на случай, если где-то не самозакрывающийся тег)
const closeRegex = /<\/img>/g;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // Защита: не лезем в системные папки
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
      processDirectory(fullPath);
    } else if (file.endsWith('.mdx') || file.endsWith('.md')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // Выполняем замены
      let newContent = content.replace(openRegex, '<Img');
      newContent = newContent.replace(closeRegex, '</Img>');

      // Перезаписываем файл, только если в нём реально были изменения
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`✅ Теги img заменены на Img в: ${file}`);
      }
    }
  }
}

console.log('🚀 Начинаем поиск тегов <img> для замены на <Img>...');

const targetDir = path.join(__dirname, 'src', 'content');

if (fs.existsSync(targetDir)) {
  processDirectory(targetDir);
} else {
  // Фолбэк: если папка не найдена, запускаем там же, где лежит скрипт
  processDirectory(__dirname);
}

console.log('🎉 Готово! Все <img ...> бережно превращены в <Img ...>.');
