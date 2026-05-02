/**
 * Main patch: loadWeekData rollover support + AddTestModal + complete button + grid improvements
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let content = readFileSync(filePath, 'utf8');

// ── Patch 1: loadWeekData - add rollover check loading ─────────────────────────
const oldSetWeekData = `      setWeekData({ columns, attMap, slots: slotMap, checks: checkMap, slotStudents: slotStudentsMap, lessonNotes: lessonNotesMap });`;
const newSetWeekData = `      // 이월 과제: rollover_date가 이번 주에 해당하는 delayed checks
      const rolloverRaws = weekDates.length > 0 ? await getRolloverChecksForWeek(weekDates) : [];
      const rolloverMap: Record<string, HomeworkCheck[]> = {};
      for (const r of rolloverRaws) {
        const d = r.rollover_date!;
        if (!rolloverMap[d]) rolloverMap[d] = [];
        rolloverMap[d].push(r);
      }

      setWeekData({ columns, attMap, slots: slotMap, checks: checkMap, slotStudents: slotStudentsMap, lessonNotes: lessonNotesMap, rolloverChecks: rolloverMap });`;

if (content.includes(oldSetWeekData)) {
  content = content.replace(oldSetWeekData, newSetWeekData);
  console.log('✅ Patch 1: loadWeekData rollover');
} else {
  console.log('❌ Patch 1 not found');
}

// ── Patch 2: Add testSessionModal state variable ────────────────────────────────
const oldModalStates = `  const [rolloverPopup, setRolloverPopup] = useState<{ slotId: string; studentName: string; slotTitle: string; existingCheck: HomeworkCheck | null } | null>(null);
  const [testResultPopup, setTestResultPopup] = useState<{ slot: HomeworkSlot; studentName: string; existingCheck: HomeworkCheck | null } | null>(null);`;
const newModalStates = `  const [rolloverPopup, setRolloverPopup] = useState<{ slotId: string; studentName: string; slotTitle: string; existingCheck: HomeworkCheck | null } | null>(null);
  const [testResultPopup, setTestResultPopup] = useState<{ slot: HomeworkSlot; studentName: string; existingCheck: HomeworkCheck | null } | null>(null);
  const [addTestModal, setAddTestModal] = useState<WeekColumn | null>(null);`;

if (content.includes(oldModalStates)) {
  content = content.replace(oldModalStates, newModalStates);
  console.log('✅ Patch 2: addTestModal state');
} else {
  console.log('❌ Patch 2 not found, trying alternate...');
}

// ── Patch 3: Column header - add test button + compact design ──────────────────
const oldColHeader = `                          {/* 세션 액션 버튼들 */}
                          {hasSes ? (
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => handleMarkAllPresent(col, col.session!)}
                                className="flex items-center gap-1 h-6 px-2 bg-emerald-500 text-white rounded-lg text-[10px] font-black hover:-translate-y-0.5 transition-all">
                                <Check size={9} /> 전체출석
                              </button>
                              <button onClick={() => setAddHwModal(col)}
                                className="flex items-center gap-1 h-6 px-2 bg-foreground/10 text-foreground rounded-lg text-[10px] font-black hover:bg-foreground/20 transition-all">
                                <Plus size={9} /> 과제
                              </button>
                              <button onClick={async () => {
                                if (!confirm("이 세션을 삭제할까요?")) return;
                                await deleteSession(col.session!.id);
                                setWeekData(prev => prev ? {
                                  ...prev,
                                  columns: prev.columns.map(cc => cc.date === col.date ? { ...cc, session: null } : cc),
                                } : null);
                              }} className="h-6 px-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size={9} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleCreateSession(col)}
                              className={\`h-6 px-2 rounded-lg text-[10px] font-black border transition-all hover:-translate-y-0.5 \${col.date <= toDateStr(new Date()) ? 'border-foreground/20 text-foreground bg-foreground/5 hover:bg-foreground/10' : 'border-foreground/10 text-accent/40'}\`}>
                              {col.date <= toDateStr(new Date()) ? '+ 수업 기록' : '예정'}
                            </button>
                          )}`;

const newColHeader = `                          {/* 세션 액션 버튼들 */}
                          {hasSes ? (
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => handleMarkAllPresent(col, col.session!)}
                                className="flex items-center gap-1 h-5 px-1.5 bg-emerald-500/80 text-white rounded-md text-[9px] font-black hover:bg-emerald-500 transition-all">
                                <Check size={8} /> 전체출석
                              </button>
                              <button onClick={() => setAddHwModal(col)}
                                className="flex items-center gap-1 h-5 px-1.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-md text-[9px] font-black hover:bg-blue-500/25 transition-all">
                                <Plus size={8} /> 과제
                              </button>
                              <button onClick={() => setAddTestModal(col)}
                                className="flex items-center gap-1 h-5 px-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md text-[9px] font-black hover:bg-amber-500/25 transition-all">
                                🎯 테스트
                              </button>
                              <button onClick={async () => {
                                if (!confirm("이 세션을 삭제할까요?")) return;
                                await deleteSession(col.session!.id);
                                setWeekData(prev => prev ? {
                                  ...prev,
                                  columns: prev.columns.map(cc => cc.date === col.date ? { ...cc, session: null } : cc),
                                } : null);
                              }} className="h-5 px-1 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all">
                                <Trash2 size={8} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleCreateSession(col)}
                              className={\`h-5 px-2 rounded-md text-[9px] font-black border transition-all hover:-translate-y-0.5 \${col.date <= toDateStr(new Date()) ? 'border-foreground/20 text-foreground/60 bg-foreground/5 hover:bg-foreground/10' : 'border-foreground/8 text-foreground/20'}\`}>
                              {col.date <= toDateStr(new Date()) ? '+ 수업 기록' : '예정'}
                            </button>
                          )}`;

if (content.includes(oldColHeader)) {
  content = content.replace(oldColHeader, newColHeader);
  console.log('✅ Patch 3: column header test button');
} else {
  console.log('❌ Patch 3 not found');
}

// ── Patch 4: Student name column - make more compact ──────────────────────────
const oldStudentCol = `                    {/* 학생 컬럼 헤더 */}
                    <th className="sticky left-0 z-30 bg-background border-b border-r border-foreground/10 px-4 py-3 text-left min-w-[120px]">
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest">학생</p>
                      <p className="text-[10px] text-accent/50">{students.length}명</p>
                    </th>`;

const newStudentCol = `                    {/* 학생 컬럼 헤더 */}
                    <th className="sticky left-0 z-30 bg-background border-b border-r border-foreground/10 px-2 py-2 text-left min-w-[80px] max-w-[100px]">
                      <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">학생</p>
                      <p className="text-[9px] text-foreground/25">{students.length}명</p>
                    </th>`;

if (content.includes(oldStudentCol)) {
  content = content.replace(oldStudentCol, newStudentCol);
  console.log('✅ Patch 4: compact student column header');
} else {
  console.log('❌ Patch 4 not found');
}

// ── Patch 5: Student name cell - compact ──────────────────────────────────────
const oldStudentCell = `                      {/* 학생 이름 셀 */}
                      <td className="sticky left-0 bg-background border-b border-r border-foreground/8 px-4 py-2 z-10"
                        style={{ background: si % 2 === 0 ? undefined : 'hsl(var(--foreground)/0.015)' }}>
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-[12px] font-black text-foreground">{stu.student_name}</p>
                            <p className="text-[9px] text-accent">{stu.student_class}</p>
                          </div>
                          <button onClick={() => setRemoveConfirm(stu.student_name)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 transition-all">
                            <X size={10} />
                          </button>
                        </div>
                      </td>`;

const newStudentCell = `                      {/* 학생 이름 셀 */}
                      <td className="sticky left-0 bg-background border-b border-r border-foreground/8 px-2 py-1.5 z-10 min-w-[80px] max-w-[100px]"
                        style={{ background: si % 2 === 0 ? undefined : 'hsl(var(--foreground)/0.015)' }}>
                        <div className="flex items-center justify-between group">
                          <p className="text-[11px] font-black text-foreground/90 leading-tight truncate">{stu.student_name}</p>
                          <button onClick={() => setRemoveConfirm(stu.student_name)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-red-300 hover:text-red-500 transition-all shrink-0 ml-0.5">
                            <X size={9} />
                          </button>
                        </div>
                      </td>`;

if (content.includes(oldStudentCell)) {
  content = content.replace(oldStudentCell, newStudentCell);
  console.log('✅ Patch 5: compact student cell');
} else {
  console.log('❌ Patch 5 not found');
}

// ── Patch 6: Compact column header (date) ─────────────────────────────────────
const oldDateCol = `                          className={\`border-b border-r border-foreground/10 px-3 py-2 min-w-[160px] \${today ? 'bg-foreground/4' : 'bg-background'}\`}>
                          {/* 날짜 제목 */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <p className={\`text-[12px] font-black \${today ? colColor : 'text-foreground'}\`}>
                                {col.dayName} {col.date.slice(5).replace('-', '/')}
                                {col.is_clinic && <span className="ml-1 text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-black">클리닉</span>}
                                {today && <span className="ml-1 text-[9px] bg-foreground text-background px-1.5 py-0.5 rounded font-black">오늘</span>}
                              </p>
                              <p className="text-[10px] text-accent/60">{col.time}{col.end_time ? \`~\${col.end_time}\` : ''}</p>
                            </div>
                          </div>`;

const newDateCol = `                          className={\`border-b border-r border-foreground/10 px-2 py-2 min-w-[140px] \${today ? 'bg-foreground/4' : 'bg-background'}\`}>
                          {/* 날짜 제목 */}
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className={\`text-[11px] font-black \${today ? colColor : 'text-foreground/70'}\`}>
                                {col.dayName} {col.date.slice(5).replace('-', '/')}
                                {col.is_clinic && <span className="ml-1 text-[8px] bg-teal-500/20 text-teal-400 px-1 py-0.5 rounded font-black">클리닉</span>}
                                {today && <span className="ml-1 text-[8px] bg-foreground/80 text-background px-1 py-0.5 rounded font-black">오늘</span>}
                              </p>
                              <p className="text-[9px] text-foreground/30">{col.time}{col.end_time ? \`~\${col.end_time}\` : ''}</p>
                            </div>
                          </div>`;

if (content.includes(oldDateCol)) {
  content = content.replace(oldDateCol, newDateCol);
  console.log('✅ Patch 6: compact date column header');
} else {
  console.log('❌ Patch 6 not found');
}

// ── Patch 7: Attendance button - compact ──────────────────────────────────────
const oldAttBtn = `                                {/* 출결 버튼 */}
                                <button
                                  onClick={() => setAttPopup({ date: col.date, studentName: stu.student_name, session: col.session })}
                                  className={\`w-full text-center px-2 py-1.5 rounded-xl text-[11px] font-black transition-all hover:-translate-y-0.5 \${att ? ATT_STYLE[att.status] : 'border border-dashed border-foreground/20 text-foreground/30 hover:border-foreground/40'}\`}>
                                  {att ? (<>
                                    {ATT_LABEL[att.status]}
                                    {att.status === 'late' && att.late_arrival_time && <span className="block text-[9px] opacity-70">{att.late_arrival_time}</span>}
                                    {att.status === 'absent' && att.makeup_type && <span className="block text-[9px] opacity-70">{att.makeup_type === 'direct' ? '직접보강' : '영상보강'}</span>}
                                  </>) : '미기록'}
                                </button>`;

const newAttBtn = `                                {/* 출결 버튼 - 컴팩트 */}
                                <button
                                  onClick={() => setAttPopup({ date: col.date, studentName: stu.student_name, session: col.session })}
                                  className={\`w-full text-center px-1.5 py-1 rounded-lg text-[10px] font-black transition-all hover:opacity-80 \${att ? ATT_STYLE[att.status] : 'border border-dashed border-foreground/15 text-foreground/20 hover:border-foreground/30'}\`}>
                                  {att ? (<>
                                    <span>{ATT_SHORT[att.status]}</span>
                                    {att.status === 'late' && att.late_arrival_time && <span className="ml-1 text-[8px] opacity-60">{att.late_arrival_time.slice(0,5)}</span>}
                                    {att.status === 'absent' && att.makeup_type && <span className="ml-1 text-[8px] opacity-60">{att.makeup_type === 'direct' ? '보강' : '영상'}</span>}
                                  </>) : '—'}
                                </button>`;

if (content.includes(oldAttBtn)) {
  content = content.replace(oldAttBtn, newAttBtn);
  console.log('✅ Patch 7: compact attendance button');
} else {
  console.log('❌ Patch 7 not found');
}

// ── Patch 8: General homework display - add "완료" button for pending/delayed ──
const oldHwItem = `                                {/* 일반과제 체크 */}
                                {myGeneral.map(slot => {
                                  const chk = weekData.checks[slot.id]?.[stu.student_name];
                                  const status = chk?.status || 'pending';
                                  return (
                                    <div key={slot.id} className="flex items-center gap-1">
                                      <button
                                        onClick={async () => {
                                          const newStatus: HwStatus = status === 'done' ? 'pending' : 'done';
                                          await upsertHomeworkCheck({ slot_id: slot.id, student_name: stu.student_name, status: newStatus });
                                          setWeekData(prev => prev ? { ...prev, checks: { ...prev.checks, [slot.id]: { ...(prev.checks[slot.id] || {}), [stu.student_name]: { ...(chk || {}), slot_id: slot.id, student_name: stu.student_name, status: newStatus } as HomeworkCheck } } } : prev);
                                        }}
                                        className={\`flex-1 text-left px-2 py-1 rounded-lg text-[10px] font-bold transition-all truncate max-w-[100px] \${
                                          status === 'done' ? 'bg-emerald-100 text-emerald-700 line-through opacity-70' :
                                          status === 'delayed' ? 'bg-amber-100 text-amber-700' : 'bg-foreground/6 text-foreground/60 hover:bg-foreground/12'
                                        }\`}>
                                        {status === 'done' ? '✅' : status === 'delayed' ? '⏩' : '☐'} {slot.title}
                                      </button>
                                      {status !== 'done' && (
                                        <button onClick={() => setRolloverPopup({ slotId: slot.id, studentName: stu.student_name, slotTitle: slot.title, existingCheck: chk || null })}
                                          className="shrink-0 px-1.5 py-1 rounded-lg text-[9px] font-black bg-orange-50 text-orange-500 hover:bg-orange-100 transition-all border border-orange-200">
                                          이월
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}`;

const newHwItem = `                                {/* 일반과제 체크 */}
                                {myGeneral.map(slot => {
                                  const chk = weekData.checks[slot.id]?.[stu.student_name];
                                  const status = chk?.status || 'pending';
                                  return (
                                    <div key={slot.id} className="flex items-center gap-0.5">
                                      <button
                                        onClick={async () => {
                                          const newStatus: HwStatus = status === 'done' ? 'pending' : 'done';
                                          await upsertHomeworkCheck({ slot_id: slot.id, student_name: stu.student_name, status: newStatus });
                                          setWeekData(prev => prev ? { ...prev, checks: { ...prev.checks, [slot.id]: { ...(prev.checks[slot.id] || {}), [stu.student_name]: { ...(chk || {}), slot_id: slot.id, student_name: stu.student_name, status: newStatus } as HomeworkCheck } } } : prev);
                                        }}
                                        className={\`flex-1 text-left px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all truncate \${
                                          status === 'done' ? 'bg-emerald-500/15 text-emerald-400 line-through opacity-70' :
                                          status === 'delayed' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' :
                                          'bg-foreground/5 text-foreground/50 hover:bg-foreground/10 border border-foreground/8'
                                        }\`}>
                                        {status === 'done' ? '✓' : status === 'delayed' ? '⏩' : '○'} {slot.title}
                                      </button>
                                      {status !== 'done' && (
                                        <>
                                          <button onClick={async () => {
                                            await upsertHomeworkCheck({ slot_id: slot.id, student_name: stu.student_name, status: 'done' });
                                            setWeekData(prev => prev ? { ...prev, checks: { ...prev.checks, [slot.id]: { ...(prev.checks[slot.id] || {}), [stu.student_name]: { ...(chk || {}), slot_id: slot.id, student_name: stu.student_name, status: 'done' } as HomeworkCheck } } } : prev);
                                          }}
                                            className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all border border-emerald-500/20"
                                            title="완료 처리">
                                            ✓완
                                          </button>
                                          <button onClick={() => setRolloverPopup({ slotId: slot.id, studentName: stu.student_name, slotTitle: slot.title, existingCheck: chk || null })}
                                            className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-all border border-orange-500/20"
                                            title="이월 처리">
                                            ⏩이
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}`;

if (content.includes(oldHwItem)) {
  content = content.replace(oldHwItem, newHwItem);
  console.log('✅ Patch 8: homework complete button');
} else {
  console.log('❌ Patch 8 not found');
}

// ── Patch 9: Grid cell container - more compact ────────────────────────────────
const oldCellContainer = `                          <td key={col.date}
                            className={\`border-b border-r border-foreground/8 px-2 py-1.5 align-top \${isToday(col.date) ? 'bg-foreground/3' : ''}\`}>
                            {col.session ? (
                              <div className="flex flex-col gap-1 min-w-[150px]">`;

const newCellContainer = `                          <td key={col.date}
                            className={\`border-b border-r border-foreground/8 px-1.5 py-1 align-top \${isToday(col.date) ? 'bg-foreground/3' : ''}\`}>
                            {col.session ? (
                              <div className="flex flex-col gap-0.5 min-w-[130px]">`;

if (content.includes(oldCellContainer)) {
  content = content.replace(oldCellContainer, newCellContainer);
  console.log('✅ Patch 9: compact cell container');
} else {
  console.log('❌ Patch 9 not found');
}

writeFileSync(filePath, content, 'utf8');
console.log('\n✅ All patches written to file');
