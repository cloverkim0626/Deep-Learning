$file = 'src\lib\database-service.ts'
$content = Get-Content $file -Raw -Encoding UTF8

$insertAfter = 'export async function getTestSessionsByStudent(studentName: string) {
  const { data, error } = await supabase
    .from(''test_sessions'')
    .select(''*, test_results(*)'')
    .eq(''student_name'', studentName)
    .order(''created_at'', { ascending: false });
  if (error) throw error;
  return data;
}'

$newFunction = @'

export async function getAllTestSessions() {
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id, student_name, set_id, test_type, correct_count, total_questions, completed_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
'@

$escaped = [Regex]::Escape($insertAfter)
$updated = $content -replace $escaped, ($insertAfter + $newFunction)

if ($updated -eq $content) {
  Write-Host "ERROR: Pattern not found!" -ForegroundColor Red
} else {
  $updated | Out-File $file -Encoding utf8 -NoNewline
  Write-Host "OK: getAllTestSessions inserted" -ForegroundColor Green
}
