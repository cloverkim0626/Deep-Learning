$f = 'src\app\(student)\dashboard\word-test\page.tsx'
$lines = Get-Content $f -Encoding UTF8
# Find the line with </div> closing source div (line 233 is index 232)
# Insert label div after index 232
$before = $lines[0..232]
$insert = @('                  {/* 제목 작게 */}', '                  <div className="text-[10px] text-accent/45 mt-0.5 truncate">{s.label}</div>')
$after  = $lines[233..($lines.Length-1)]
$new = $before + $insert + $after
$new | Out-File $f -Encoding UTF8
Write-Host "Done. Lines: $($new.Length)"
