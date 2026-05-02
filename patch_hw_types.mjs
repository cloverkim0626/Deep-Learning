import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/admin/dashboard/classes/[id]/page.tsx';
const content = readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the start line (the comment line)
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('HW_TYPE_DISPLAY') && lines[i].includes('const')) {
    endIdx = i;
  }
  if (lines[i].includes('HW_TYPES') && lines[i].includes('value: HwType') && startIdx === -1) {
    // Find the comment line above
    startIdx = i - 1;
  }
}

console.log(`Found HW_TYPES at lines ${startIdx+1} to ${endIdx+1}`);
console.log('Start line:', JSON.stringify(lines[startIdx]));
console.log('End line:', JSON.stringify(lines[endIdx]));

if (startIdx >= 0 && endIdx >= 0) {
  const replacement = [
    '// 과제 종류 (테스트는 테스트 버튼으로 별도 처리)',
    "const HW_TYPES: { value: HwType; label: string }[] = [",
    "  { value: 'general',      label: '문제풀이' },",
    "  { value: 'passage_read', label: '워크북' },",
    "  { value: 'test_prep',    label: '테스트준비' },",
    "  { value: 'other',        label: '기타' },",
    "];",
    "const HW_TYPE_LABEL: Record<string, string> = {",
    "  general: '문제풀이', passage_read: '워크북', test_prep: '테스트준비',",
    "  essay: '지문복습', other: '기타', vocab_test: '단어테스트',",
    "};",
  ];
  
  lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
  writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('✅ HW_TYPES replaced successfully');
  console.log('New lines around that area:');
  for (let i = startIdx - 1; i <= startIdx + replacement.length; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
