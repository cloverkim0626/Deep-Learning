const fs = require('fs');
const file = 'src/app/(student)/dashboard/layout.tsx';
const c = fs.readFileSync(file, 'utf8');
const lines = c.split('\n');

// Line 706 (0-indexed): Replace +10점 Q&A line with +5점
// Line 707: </div>  → keep
// Line 708: </div>  → insert clinic line before this

// Rebuild: replace line 706 content, then insert clinic after 707
const qnaLine = lines[706];
lines[706] = qnaLine.replace('+10\uC810', '+5\uC810');

// Insert clinic line after index 707 (after Q&A closing div)
const clinicLines = [
  '                          <div className="flex items-start gap-2">',
  '                            <span className="text-[11px] font-bold text-foreground/40 w-3 mt-0.5">\u00B7</span>',
  '                            <p className="text-[11.5px] text-foreground/70 leading-relaxed">\uD074\uB9AC\uB2C9 1\uD68C \uC2E0\uCCAD &amp; <strong className="text-foreground">\uC0C1\uB2F4 \uC644\uB8CC = +10\uC810</strong></p>',
  '                          </div>',
];
lines.splice(708, 0, ...clinicLines);

// Also fix streak footnote: find the line with 매월 말 일괄
const streakFootIdx = lines.findIndex(l => l.includes('\uB9E4\uC6D4 \uB9D0 \uC77C\uAD04 \uC9C0\uAE09') && l.includes('Streak'));
if(streakFootIdx >= 0) {
  console.log('streak foot line already correct at', streakFootIdx);
} else {
  // find original footnote line
  const footIdx = lines.findIndex(l => l.includes('\uB2EC\uC131 \uC775\uC77C \uC989\uC2DC \uC9C0\uAE09'));
  console.log('streak immediate payout line:', footIdx, footIdx >= 0 ? lines[footIdx] : 'not found');
}

// Write
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Done. Q&A 5점:', lines[706].includes('+5\uC810'));
console.log('clinic added:', lines[709].includes('\uC0C1\uB2F4 \uC644\uB8CC'));
