$f = 'src\app\(student)\dashboard\word-test\page.tsx'
$all = Get-Content $f -Encoding UTF8

# Replace lines 199-252 (0-indexed) with the new card block
# The new block uses standard array of strings to avoid heredoc encoding issues
$newCard = [System.Collections.Generic.List[string]]::new()
$newCard.Add('          return (')
$newCard.Add('            <button')
$newCard.Add('              key={s.id}')
$newCard.Add('              onClick={() => toggle(s.id)}')
$newCard.Add('              className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${')
$newCard.Add('                isSelected')
$newCard.Add("                  ? 'border-foreground/25 bg-foreground/[0.03] shadow-sm'")
$newCard.Add("                  : 'border-foreground/[0.09] bg-white/70 hover:border-foreground/20'")
$newCard.Add('              }`}')
$newCard.Add('            >')
$newCard.Add('              {/* ' + '체크박스 */}')
$newCard.Add('              <div className={`w-5 h-5 rounded-md border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${')
$newCard.Add("                isSelected ? 'bg-foreground border-foreground' : 'border-foreground/20'")
$newCard.Add('              }`}>')
$newCard.Add('                {isSelected && (')
$newCard.Add('                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">')
$newCard.Add('                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>')
$newCard.Add('                  </svg>')
$newCard.Add('                )}')
$newCard.Add('              </div>')
$newCard.Add('              {/* ' + '텍스트 */}')
$newCard.Add('              <div className="flex-1 min-w-0">')
$newCard.Add('                {/* ' + '출처 크게 */}')
$newCard.Add('                <div className="text-[13.5px] font-black text-foreground leading-snug">')
$newCard.Add('                  {source}')
$newCard.Add('                  {(synCount > 0 || antCount > 0) && (')
$newCard.Add('                    <span className="ml-1.5 font-bold">')
$newCard.Add('                      {synCount > 0 && <span className="text-blue-600">{` ' + '${synCount}`}</span>}')
$newCard.Add('                      {synCount > 0 && antCount > 0 && <span className="text-accent/30 mx-0.5">{"·"}</span>}')
$newCard.Add('                      {antCount > 0 && <span className="text-rose-500">{`' + '반${antCount}`}</span>}')
$newCard.Add('                      <span className="text-accent/30">{` · ' + '총 ${synCount + antCount}문제`}</span>')
$newCard.Add('                    </span>')
$newCard.Add('                  )}')
$newCard.Add('                </div>')
$newCard.Add('                {/* ' + '제목 작게 */}')
$newCard.Add('                <div className="text-[10px] text-accent/45 mt-0.5 truncate">{s.label}</div>')
$newCard.Add('                {/* PASS ' + '도장 인라인 하단 */}')
$newCard.Add('                {(vocabPassed || synPassed) && (')
$newCard.Add('                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">')
$newCard.Add('                    {vocabPassed && (')
$newCard.Add('                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[9px] font-black tracking-wide select-none" style={{ transform: "rotate(-1deg)" }}>')
$newCard.Add('                        {"\u2605 PASS " }<span className="opacity-75 text-[8px]">{'+"'"+'뜻쓰기'+"'"+'}</span>')
$newCard.Add('                      </span>')
$newCard.Add('                    )}')
$newCard.Add('                    {synPassed && (')
$newCard.Add('                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black tracking-wide select-none" style={{ transform: "rotate(1deg)" }}>')
$newCard.Add('                        {"\u2605 PASS "}<span className="opacity-75 text-[8px]">{'+"'"+'유반의어'+"'"+'}</span>')
$newCard.Add('                      </span>')
$newCard.Add('                    )}')
$newCard.Add('                  </div>')
$newCard.Add('                )}')
$newCard.Add('              </div>')
$newCard.Add('            </button>')
$newCard.Add('          );')

# Find where the old return block starts (line with 'return (') in the map
# We know from viewing: the card block is around index 199-238
# Let's find the exact indices by searching
$startIdx = -1
$endIdx = -1

for ($i = 150; $i -lt 260; $i++) {
    if ($all[$i] -match '^\s+return \($' -and $startIdx -eq -1) {
        $startIdx = $i
    }
}
# Find end: the closing ); of the return block (after the </div> wrapper)
for ($i = $startIdx + 1; $i -lt [Math]::Min($startIdx + 60, $all.Length); $i++) {
    if ($all[$i] -match '^\s+\);\s*$') {
        $endIdx = $i
        break
    }
}

Write-Host "StartIdx: $startIdx, EndIdx: $endIdx"
Write-Host "Before: $($all[$startIdx])"
Write-Host "End: $($all[$endIdx])"

if ($startIdx -ge 0 -and $endIdx -gt $startIdx) {
    $before = $all[0..($startIdx-1)]
    $after  = $all[($endIdx+1)..($all.Length-1)]
    $result = $before + $newCard + $after
    $result | Out-File $f -Encoding UTF8
    Write-Host "Done. Lines: $($result.Length)"
} else {
    Write-Host "ERROR: Could not find block boundaries"
}
