import fs from 'fs';

const file = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let c = fs.readFileSync(file, 'utf8');
const lines = c.split('\n');

// Find start (td key={col.date}) and end (closing </td>;) within the students.map
const startMark = "className=\"border-b border-r px-1.5 py-1 align-top\" style={{borderColor: '#e2e8f0'";
const endMark = "                          </td>";

let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (startIdx === -1 && lines[i].includes(startMark)) {
    startIdx = i - 1; // include <td key= line before
    break;
  }
}
// Find the first </td> that closes this td, searching forward
let depth = 0;
for (let i = startIdx; i < lines.length; i++) {
  const l = lines[i];
  depth += (l.match(/<td/g) || []).length;
  depth -= (l.match(/<\/td>/g) || []).length;
  if (depth === 0 && i > startIdx) {
    endIdx = i;
    break;
  }
}

console.log(`Found block: lines ${startIdx+1} to ${endIdx+1}`);
console.log('First line:', lines[startIdx]);
console.log('Last line:', lines[endIdx]);

const newCell = `                        <td key={col.date}
                          className="border-b border-r align-top" style={{borderColor: '#e2e8f0', background: isToday(col.date) ? '#eef2ff' : (si % 2 === 0 ? '#ffffff' : '#f8fafc')}}>
                          {col.session ? (
                            <div className="min-w-[140px]">

                              {/* ── 출결 섹션 ── */}
                              <div className="px-1.5 pt-1 pb-1 border-b border-slate-100">
                                <button
                                  onClick={() => setAttPopup({ date: col.date, studentName: stu.student_name, session: col.session })}
                                  className={\`w-full text-center px-1 py-0.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80 \${
                                    att ? ATT_STYLE[att.status] : 'border border-dashed border-slate-300 text-slate-400 hover:border-slate-400'
                                  }\`}>
                                  {att ? (<>
                                    <span>{ATT_SHORT[att.status]}</span>
                                    {att.status === 'late' && att.late_arrival_time && <span className="ml-1 text-[8px] opacity-60">{att.late_arrival_time.slice(0,5)}</span>}
                                    {att.status === 'absent' && att.makeup_type && <span className="ml-1 text-[8px] opacity-60">{att.makeup_type === 'direct' ? '보강' : '영상'}</span>}
                                  </>) : '—'}
                                </button>
                              </div>

                              {/* ── 과제 섹션 ── */}
                              {(myGeneral.length > 0 || (weekData.rolloverChecks[col.date] || []).some(rc => rc.student_name === stu.student_name)) && (
                                <div className="px-1.5 pt-0.5 pb-1 border-b border-slate-100 space-y-0.5">
                                  {myGeneral.map(slot => {
                                    const chk = weekData.checks[slot.id]?.[stu.student_name];
                                    const status = chk?.status || 'pending';
                                    const isDone = status === 'done';
                                    const isDonePartial = status === 'done_partial';
                                    const isDelayed = status === 'delayed';
                                    return (
                                      <div key={slot.id} className="flex items-center gap-0.5">
                                        <button
                                          onClick={async () => {
                                            const next: HwStatus = status === 'pending' ? 'done' : status === 'done' ? 'done_partial' : 'pending';
                                            await upsertHomeworkCheck({ slot_id: slot.id, student_name: stu.student_name, status: next });
                                            setWeekData(prev => prev ? { ...prev, checks: { ...prev.checks, [slot.id]: { ...(prev.checks[slot.id] || {}), [stu.student_name]: { ...(chk || {}), slot_id: slot.id, student_name: stu.student_name, status: next } as HomeworkCheck } } } : prev);
                                          }}
                                          className={\`flex-1 text-left px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all truncate \${
                                            isDone        ? 'bg-emerald-50 text-emerald-700 line-through' :
                                            isDonePartial ? 'bg-sky-50 text-sky-700' :
                                            isDelayed     ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                                          }\`}>
                                          {isDone ? '✓완' : isDonePartial ? '↩귀' : isDelayed ? '⏩' : '○'} {slot.title}
                                        </button>
                                        {!isDone && !isDonePartial && (
                                          <button onClick={() => setRolloverPopup({ slotId: slot.id, studentName: stu.student_name, slotTitle: slot.title, existingCheck: chk || null })}
                                            className="shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-orange-50 text-orange-500 hover:bg-orange-100 border border-orange-200"
                                            title="이월">
                                            ⏩
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {/* 이월과제 */}
                                  {(weekData.rolloverChecks[col.date] || [])
                                    .filter(rc => rc.student_name === stu.student_name)
                                    .map(rc => (
                                      <div key={rc.id || rc.slot_id + rc.student_name} className="flex items-center gap-0.5">
                                        <div className="flex-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200 truncate">⏩ 이월</div>
                                        <button onClick={async () => {
                                          await upsertHomeworkCheck({ slot_id: rc.slot_id, student_name: stu.student_name, status: 'done', rollover_date: null });
                                          setWeekData(prev => {
                                            if (!prev) return prev;
                                            const nr = { ...prev.rolloverChecks };
                                            nr[col.date] = (nr[col.date] || []).filter(r => !(r.slot_id === rc.slot_id && r.student_name === stu.student_name));
                                            return { ...prev, rolloverChecks: nr, checks: { ...prev.checks, [rc.slot_id]: { ...(prev.checks[rc.slot_id] || {}), [stu.student_name]: { ...(rc as HomeworkCheck), status: 'done', rollover_date: null } } } };
                                          });
                                        }}
                                          className="shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                                          ✓
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              )}

                              {/* ── 테스트 섹션 ── */}
                              {myTests.length > 0 && (
                                <div className="px-1.5 pt-0.5 pb-1 space-y-0.5">
                                  {myTests.map(slot => {
                                    const chk = weekData.checks[slot.id]?.[stu.student_name];
                                    return (
                                      <div key={slot.id} className="flex items-center gap-0.5">
                                        <div className={\`flex-1 px-1 py-0.5 rounded text-[9px] font-bold truncate \${
                                          chk?.score != null ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                        }\`}>
                                          🎯 {slot.title}
                                          {chk?.score != null && <span className="ml-1 font-black">{chk.score}{slot.max_score ? \`/\${slot.max_score}\` : ''}{slot.is_pf ? (chk.is_pass ? ' P' : ' F') : ''}</span>}
                                        </div>
                                        <button onClick={() => setTestResultPopup({ slot, studentName: stu.student_name, existingCheck: chk || null })}
                                          className="shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200">
                                          {chk?.score != null ? '수정' : '입력'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                            </div>
                          ) : (
                            <div className="text-center text-[10px] text-slate-300 py-2 min-w-[100px]">—</div>
                          )}
                        </td>`;

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
const result = [...before, newCell, ...after].join('\n');
fs.writeFileSync(file, result, 'utf8');
console.log(`✅ Replaced lines ${startIdx+1}–${endIdx+1} with new sectioned cell layout`);
