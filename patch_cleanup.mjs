/**
 * Cleanup + core patches for page.tsx
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let lines = readFileSync(filePath, 'utf8').split('\n');

// ── Remove duplicate ATT_SHORT (lines 44-46, 0-indexed 43-45) ─────────────────
// Find all ATT_SHORT definitions
const attShortLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const ATT_SHORT')) {
    attShortLines.push(i);
  }
}
console.log('ATT_SHORT at lines:', attShortLines.map(x => x+1));

// Remove the second ATT_SHORT block (lines 44-46, index 43-45)
if (attShortLines.length >= 2) {
  const secondStart = attShortLines[1];
  // Remove 3 lines: const ATT_SHORT = {, content, };
  lines.splice(secondStart, 3);
  console.log('✅ Removed duplicate ATT_SHORT');
}

writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done. Current lines around ATT_SHORT:');
const newLines = readFileSync(filePath, 'utf8').split('\n');
for (let i = 37; i <= 50; i++) {
  console.log(`${i+1}: ${newLines[i]}`);
}
