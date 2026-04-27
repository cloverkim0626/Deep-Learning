$file = 'src\app\admin\dashboard\content\page.tsx'
$lines = Get-Content $file -Encoding UTF8

# Insert after line 221 (index 220) = closing </div> of workbook/chapter text div
# Line 220 (0-indexed) is the workbook/chapter join line
# Line 221 (0-indexed) is </div> closing text div
# Line 222 (0-indexed) is </div> closing flex-1 div

# We insert PASS badge rows between line 221 and 222 (after inner text div closes, before outer div closes)
$insertIdx = 221  # 0-indexed, insert AFTER this line

$badgeLines = @(
    "                      {/* PASS badges per test type */}",
    "                      <div className=""flex items-center gap-1.5 mt-1 flex-wrap"">",
    "                        {passBadge(getSession(studentName, row.set_id, 'vocab'), 90, '\ucf1c\uc4f0\uae30', 'emerald')}",
    "                        {passBadge(getSession(studentName, row.set_id, 'synonym'), 70, '\uc720\ubc18\uc758\uc5b4', 'sky')}",
    "                      </div>"
)

$newLines = $lines[0..$insertIdx] + $badgeLines + $lines[($insertIdx+1)..($lines.Count-1)]

Write-Host "Lines before: $($lines.Count), after: $($newLines.Count)"
$newLines | Out-File $file -Encoding UTF8
