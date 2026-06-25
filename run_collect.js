const fs = require('fs');
const files = [
  'supabase/init.sql',
  'src/pages/tests/useTestsData.ts',
  'src/features/VocalTunerPage.tsx',
  'src/pages/tests/TestsPage.tsx',
  'src/pages/tests/TestRunner.tsx'
];
let out = '';
files.forEach(f => {
  if (fs.existsSync(f)) {
    const ext = f.endsWith('.sql') ? 'sql' : 'typescript';
    out += `\n\n\`\`\`${ext}\n// ==========================================\n// FILE: ${f}\n// ==========================================\n${fs.readFileSync(f, 'utf8')}\n\`\`\`\n`;
  } else {
    out += `\n\n// Файл не найден: ${f}\n`;
  }
});
fs.writeFileSync('temp_review_files.md', out);
console.log('Сборка успешно завершена! Файл temp_review_files.md готов.');
