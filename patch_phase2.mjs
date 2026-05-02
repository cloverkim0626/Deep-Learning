/**
 * Phase 2: Add rollover display in cells + AddTestModal rendering + modal wiring
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let content = readFileSync(filePath, 'utf8');

// ── Patch 1: Add rollover display after vocab_test section in cell ─────────────
const oldNoSlot = `                                {mySlots.length === 0 && sessionSlots.length > 0 && (
                                  <p className="text-[9px] text-foreground/25 text-center py-0.5">배당없음</p>
                                )}`;

const newNoSlot = `                                {mySlots.length === 0 && sessionSlots.length > 0 && (
                                  <p className="text-[9px] text-foreground/25 text-center py-0.5">배당없음</p>
                                )}
                                {/* 이월된 과제 표시 */}
                                {(weekData.rolloverChecks[col.date] || [])
                                  .filter(rc => rc.student_name === stu.student_name)
                                  .map(rc => (
                                    <div key={rc.id || rc.slot_id + rc.student_name} className="flex items-center gap-0.5">
                                      <div className="flex-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/10 text-orange-300 border border-orange-500/20 truncate">
                                        ⏩ 이월과제
                                      </div>
                                      <button onClick={async () => {
                                        await upsertHomeworkCheck({ slot_id: rc.slot_id, student_name: stu.student_name, status: 'done', rollover_date: null });
                                        setWeekData(prev => {
                                          if (!prev) return prev;
                                          const newRollovers = { ...prev.rolloverChecks };
                                          newRollovers[col.date] = (newRollovers[col.date] || []).filter(r => !(r.slot_id === rc.slot_id && r.student_name === stu.student_name));
                                          return { ...prev, rolloverChecks: newRollovers, checks: { ...prev.checks, [rc.slot_id]: { ...(prev.checks[rc.slot_id] || {}), [stu.student_name]: { ...(rc as HomeworkCheck), status: 'done', rollover_date: null } } } };
                                        });
                                      }}
                                        className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20">
                                        ✓완
                                      </button>
                                    </div>
                                  ))}`;

if (content.includes(oldNoSlot)) {
  content = content.replace(oldNoSlot, newNoSlot);
  console.log('✅ Patch 1: rollover display in cells');
} else {
  console.log('❌ Patch 1 not found');
}

// ── Patch 2: Add AddTestModal rendering at bottom (before closing div) ─────────
const oldCloseModals = `      {/* ─── 테스트 결과 팝업 ──────────────────────────────────────────── */}
      {testResultPopup && (
        <TestResultPopup
          slot={testResultPopup.slot}
          studentName={testResultPopup.studentName}
          existingCheck={testResultPopup.existingCheck}
          onClose={() => setTestResultPopup(null)}
          onSaved={(check) => {
            setWeekData(prev => prev ? {
              ...prev,
              checks: { ...prev.checks, [testResultPopup.slot.id]: { ...(prev.checks[testResultPopup.slot.id] || {}), [testResultPopup.studentName]: check } }
            } : prev);
            setTestResultPopup(null);
          }}
        />
      )}
    </div>
  );
}`;

const newCloseModals = `      {/* ─── 테스트 결과 팝업 ──────────────────────────────────────────── */}
      {testResultPopup && (
        <TestResultPopup
          slot={testResultPopup.slot}
          studentName={testResultPopup.studentName}
          existingCheck={testResultPopup.existingCheck}
          onClose={() => setTestResultPopup(null)}
          onSaved={(check) => {
            setWeekData(prev => prev ? {
              ...prev,
              checks: { ...prev.checks, [testResultPopup.slot.id]: { ...(prev.checks[testResultPopup.slot.id] || {}), [testResultPopup.studentName]: check } }
            } : prev);
            setTestResultPopup(null);
          }}
        />
      )}

      {/* ─── 테스트 추가 모달 (헤더 버튼) ─────────────────────────────── */}
      {addTestModal && addTestModal.session && (
        <TestSessionModal
          session={addTestModal.session}
          students={students}
          existingSlot={null}
          existingChecks={{}}
          onClose={() => setAddTestModal(null)}
          onSaved={(slot, checks) => {
            setWeekData(prev => {
              if (!prev || !addTestModal.session) return prev;
              const sid = addTestModal.session.id;
              const newChecks = { ...prev.checks };
              newChecks[slot.id] = checks;
              return {
                ...prev,
                slots: { ...prev.slots, [sid]: [...(prev.slots[sid] || []), slot] },
                checks: newChecks,
              };
            });
            setAddTestModal(null);
          }}
        />
      )}
    </div>
  );
}`;

if (content.includes(oldCloseModals)) {
  content = content.replace(oldCloseModals, newCloseModals);
  console.log('✅ Patch 2: AddTestModal rendering');
} else {
  console.log('❌ Patch 2 not found');
}

writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Phase 2 patches applied');
