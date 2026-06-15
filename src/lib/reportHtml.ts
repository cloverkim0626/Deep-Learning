const DAY_KR = ['일','월','화','수','목','금','토'];
const ATTITUDE_COMMENT: Record<string,string> = {
  A:'매우 우수함. 적극적인 질문과 수업 참여가 돋보입니다.',
  B:'우수함. 전반적으로 양호한 수업 태도를 보입니다.',
  C:'보통. 수업에는 참여하나 더 적극적인 자세가 필요합니다.',
  D:'미흡. 수업 집중도와 참여도 개선이 필요합니다.',
  E:'매우 미흡. 학부모 상담이 필요합니다.',
};
const STATUS_MAP: Record<string,{cls:string;label:string}> = {
  done:        { cls:'completed', label:'완료' },
  done_partial:{ cls:'incomplete', label:'일부미완' },
  delayed:     { cls:'incomplete', label:'이월' },
  pending:     { cls:'new', label:'미제출' },
  skipped:     { cls:'in-class', label:'면제' },
};

function esc(s: any) { return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }

export function buildReportHtml(d: any): string {
  const { cls, session, att, note, slots, dueSlots, checks, scoreMap, clinics, vocabSessions, student_name, session_date } = d;
  const date = new Date(session_date + 'T12:00:00');
  const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
  const dayStr = DAY_KR[date.getDay()];
  const className = cls?.name || '';
  // session_date의 요일에 맞는 시간표 항목 선택 (ex: 월, 수 차이 정확히 표시)
  const DAY_KO_SCH = ['일','월','화','수','목','금','토'];
  const sessionDayKo = DAY_KO_SCH[date.getDay()];
  const scheduleArr = cls?.schedule || [];
  const schedule = scheduleArr.find((s: any) => s.day === sessionDayKo) || scheduleArr[0] || null;
  const attStatus = att?.status || 'present';
  const attLabel = attStatus==='present'?'정상 출석':attStatus==='late'?'지각':'결석';
  const attClass = attStatus==='present'?'status-present':attStatus==='late'?'status-late':'status-absent';
  const grade = att?.attitude_grade || '';

  /* 단어 앱 집계 — PASS(90% 이상)한 세션만 학습 완료로 인정 */
  const vocabByDate: Record<string,{vocab:number;synonym:number;card:number}> = {};
  for (const v of vocabSessions||[]) {
    const dt = v.completed_at?.slice(0,10); if(!dt) continue;
    const t = v.test_type||'';
    const cnt = v.correct_count||0;
    const total = v.total_questions||0;
    const passed = total > 0 && cnt / total >= 0.9; // PASS 기준: 90% 이상

    if(t==='vocab'||t==='vocab_drill') {
      // PASS한 세션만 반영 — FAIL이면 학습 없음
      if(!passed) continue;
      if(!vocabByDate[dt]) vocabByDate[dt]={vocab:0,synonym:0,card:0};
      vocabByDate[dt].vocab += cnt;
    } else if(t==='synonym'||t==='synonym_drill') {
      // PASS한 세션만 반영
      if(!passed) continue;
      if(!vocabByDate[dt]) vocabByDate[dt]={vocab:0,synonym:0,card:0};
      vocabByDate[dt].synonym += cnt;
    } else if(t==='card_game'||t==='card_game_drill') {
      // 카드게임: completed_at 있으면 통과 (total_questions가 단어수)
      const wordCount = Math.round(total/2);
      const cardPassed = cnt >= total;
      const earned = cardPassed ? wordCount : Math.round(cnt/2);
      if(earned > 0) {
        if(!vocabByDate[dt]) vocabByDate[dt]={vocab:0,synonym:0,card:0};
        vocabByDate[dt].card += earned;
      }
    }
    // 그 외 test_type은 무시
  }

  /* 날짜 범위 */
  const startDate = new Date(session_date+'T12:00:00'); startDate.setDate(startDate.getDate()-6);
  const dates: string[] = [];
  for(let d2=new Date(startDate);d2<=date;d2.setDate(d2.getDate()+1)) dates.push(d2.toISOString().slice(0,10));
  let streak = 0;
  for(let i=dates.length-1;i>=0;i--) {
    const v = vocabByDate[dates[i]];
    // 실제 학습량이 있어야만 연속으로 카운트
    if(v && (v.vocab + v.synonym + v.card > 0)) streak++;
    else break;
  }

  const vocabRows = dates.map(dt => {
    const d2 = new Date(dt+'T12:00:00');
    const isSun = d2.getDay()===0;
    const v = vocabByDate[dt]||{vocab:0,synonym:0,card:0};
    const parts: string[] = [];
    if(v.vocab) parts.push(`객관식 뜻고르기 ${v.vocab}개`);
    if(v.synonym) parts.push(`유반의어 ${v.synonym}개`);
    if(v.card) parts.push(`카드게임 ${v.card}단어`);
    const detail = parts.length ? parts.join(', ') + ' 학습 완료' : '학습 없음';
    return `<tr><td class="vocab-date${isSun?' sunday':''}">${d2.getMonth()+1}/${d2.getDate()} (${DAY_KR[d2.getDay()]})</td><td class="vocab-detail">${esc(detail)}</td></tr>`;
  }).join('');

  /* 테스트 목록: vocab_test만 테스트 결과에 표시. test_prep은 신규 과제에 포함 */
  const testSlots = (slots||[]).filter((s:any) => s.hw_type==='vocab_test');
  const testHtml = testSlots.map((s:any) => {
    const chk = (checks||[]).find((c:any)=>c.slot_id===s.id&&c.student_name===student_name);
    const score = chk?.score ?? null;
    const max = s.max_score || 1;
    const pct = score!=null ? Math.round((score/max)*100) : 0;
    const sm = scoreMap[s.id];
    const avg = sm?.scores.length ? Math.round(sm.scores.reduce((a:number,b:number)=>a+b,0)/sm.scores.length/max*100) : 0;
    const rank = sm?.scores.length ? sm.scores.filter((x:number)=>x>=(score||0)).length : 0;
    const isPF = s.is_pf;
    const scoreDisp = isPF ? (chk?.is_pass?'PASS':'FAIL') : (score!=null?`${pct}%`:'미응시');
    const retakeHtml = chk?.is_pass===false&&!isPF ? `<div class="retake-info">재시험 예정</div>` : '';
    const barHtml = !isPF&&score!=null ? `
      <div class="energy-bar-container"><div class="energy-bar-track">
        <div class="energy-bar-fill" style="width:${pct}%"><div class="student-label">${esc(student_name.slice(-2))}</div></div>
        <div class="average-marker" style="left:${avg}%"><div class="average-label">반평균</div></div>
      </div></div>` : '';
    return `<div class="test-item">
      <div class="test-header"><div class="test-name">${esc(s.title)}</div><div class="test-score">${esc(scoreDisp)}</div></div>
      <div class="test-meta"><div class="test-meta-item">${score!=null?`${score}/${max}점`:''}${rank?` · ${rank}등/${sm.scores.length}명`:''} · ${s.hw_type==='vocab_test'?'어휘':'독해'}</div></div>
      ${barHtml}${retakeHtml}
    </div>`;
  }).join('');

  /* 과제 현황 */
  const checkedHtml = (dueSlots||[]).map((s:any) => {
    const chk = (checks||[]).find((c:any)=>c.slot_id===s.id&&c.student_name===student_name);
    const st = STATUS_MAP[chk?.status||'pending']||STATUS_MAP.pending;
    return `<div class="assignment-row ${st.cls}"><div class="assignment-indicator">●</div>
      <div class="assignment-content"><div class="assignment-name">${esc(s.title)}</div></div>
      <div class="assignment-status">${st.label}</div></div>`;
  }).join('');
  const newHtml = (slots||[]).filter((s:any)=>s.hw_type!=='vocab_test').map((s:any) =>
    `<div class="assignment-row new"><div class="assignment-indicator">●</div>
      <div class="assignment-content"><div class="assignment-name">${esc(s.title)}</div></div>
      <div class="assignment-status">${s.due_date?'~'+s.due_date.slice(5).replace('-','/'):'신규'}</div></div>`
  ).join('');

  /* 클리닉 피드백 (튜터별 묶기) */
  const clinicMap: Record<string,string[]> = {};
  for(const c of clinics||[]) { const t=c.tutor_name||'김효진T'; if(!clinicMap[t]) clinicMap[t]=[]; if(c.session_feedback) clinicMap[t].push(c.session_feedback); }
  const clinicHtml = Object.entries(clinicMap).map(([tutor, feedbacks]) => {
    const isHead = tutor==='김효진T';
    const bullets = feedbacks.map(f=>`<div>- ${esc(f)}</div>`).join('');
    return `<div class="clinic-feedback-item">
      <div class="clinic-author ${isHead?'teacher':'tutor'}">${isHead?'강사 Feedback':esc(tutor)}</div>
      <div class="clinic-message">${bullets}</div></div>`;
  }).join('');
  const hasClinic = Object.keys(clinicMap).length > 0;

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>Daily Report - ${esc(student_name)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#000;color:#1a1a1a;line-height:1.5;-webkit-font-smoothing:antialiased}
.report-container{max-width:480px;margin:0 auto;background:#fff}
.hero{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 24px 28px;color:#fff}
.hero-label{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;opacity:.7;margin-bottom:12px}
.hero-title{font-size:36px;font-weight:900;letter-spacing:-1.5px;line-height:1;margin-bottom:6px}
.hero-subtitle{font-size:14px;font-weight:300;opacity:.85;margin-bottom:24px}
.hero-meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:20px;border-top:1px solid rgba(255,255,255,.2)}
.meta-item{display:flex;flex-direction:column;gap:3px}
.meta-label{font-size:9px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;opacity:.6}
.meta-value{font-size:13px;font-weight:600}
.section{background:#fff;padding:18px 20px;border-bottom:1px solid #e5e5e5}
.section-number{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:#667eea;letter-spacing:1.5px;margin-bottom:3px}
.section-title{font-size:20px;font-weight:800;letter-spacing:-.7px;color:#000;margin-bottom:12px}
.vocab-table{width:100%;border-collapse:collapse;font-size:11px}
.vocab-table thead{background:#f5f5f5}
.vocab-table th{padding:8px 10px;text-align:left;font-weight:700;color:#666;border-bottom:2px solid #e0e0e0;font-size:10px;text-transform:uppercase}
.vocab-table td{padding:8px 10px;border-bottom:1px solid #f5f5f5;color:#333}
.vocab-date{font-weight:600;color:#1a1a1a}.vocab-date.sunday{color:#ef4444}
.vocab-detail{font-size:10px;color:#666;line-height:1.4}
.streak-info{margin-top:8px;padding:8px 10px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-size:11px;font-weight:700}
.attendance-display{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:2px solid #000}
.attendance-status{font-size:18px;font-weight:700}
.status-present{color:#10b981}.status-late{color:#f59e0b}.status-absent{color:#ef4444}
.attendance-time{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:#666}
.content-header{font-size:13px;font-weight:700;padding:7px 12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;margin-bottom:10px}
.content-body{font-size:12px;color:#333;line-height:1.6;padding-left:12px;border-left:3px solid #667eea}
.attitude-container{display:flex;align-items:center;gap:18px;padding:10px 0}
.attitude-grade{font-size:70px;font-weight:900;line-height:1;letter-spacing:-2px}
.grade-A{color:#10b981}.grade-B{color:#3b82f6}.grade-C{color:#f59e0b}.grade-D{color:#f97316}.grade-E{color:#ef4444}
.attitude-description{flex:1;font-size:12px;font-weight:500;color:#333;line-height:1.5}
.test-list{display:flex;flex-direction:column;gap:18px}
.test-item{border-bottom:1px solid #e5e5e5;padding-bottom:14px}.test-item:last-child{border-bottom:none;padding-bottom:0}
.test-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.test-name{font-size:14px;font-weight:700;color:#000;flex:1}
.test-score{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:900;color:#000}
.test-meta{font-size:11px;color:#666;margin-bottom:8px}
.energy-bar-track{height:16px;background:#f0f0f0;position:relative;overflow:visible;margin:18px 0}
.energy-bar-fill{height:100%;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);position:relative}
.student-label{position:absolute;bottom:-16px;right:0;font-size:9px;font-weight:700;color:#667eea;transform:translateX(50%)}
.average-marker{position:absolute;top:-2px;bottom:-2px;width:3px;background:#ef4444;z-index:10}
.average-label{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;color:#ef4444;white-space:nowrap}
.retake-info{margin-top:8px;padding:8px 10px;background:#fffbeb;border-left:3px solid #f59e0b;font-size:11px;color:#92400e;font-weight:600}
.assignment-section{display:flex;flex-direction:column;gap:14px}
.assignment-group-title{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#999;margin-bottom:5px}
.assignment-list{display:flex;flex-direction:column;gap:1px;background:#e0e0e0}
.assignment-row{background:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px;border-left:3px solid}
.assignment-row.completed{border-color:#059669}.assignment-row.in-class{border-color:#2563eb}
.assignment-row.incomplete{border-color:#dc2626}.assignment-row.new{border-color:#7c3aed}
.assignment-indicator{width:14px;height:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900}
.assignment-row.completed .assignment-indicator{color:#059669}.assignment-row.in-class .assignment-indicator{color:#2563eb}
.assignment-row.incomplete .assignment-indicator{color:#dc2626}.assignment-row.new .assignment-indicator{color:#7c3aed}
.assignment-content{flex:1;min-width:0}.assignment-name{font-size:12px;font-weight:600;color:#1a1a1a}
.assignment-status{font-size:10px;font-weight:700;white-space:nowrap;padding:3px 7px;background:#f5f5f5}
.assignment-row.completed .assignment-status{color:#059669;background:#f0fdf4}
.assignment-row.incomplete .assignment-status{color:#dc2626;background:#fef2f2}
.assignment-row.new .assignment-status{color:#7c3aed;background:#faf5ff}
.clinic-section{background:#1a1a1a;padding:20px;border-bottom:1px solid #000}
.clinic-badge{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8b5cf6;margin-bottom:6px}
.clinic-title{font-size:20px;font-weight:800;letter-spacing:-.7px;color:#fff;margin-bottom:4px}
.clinic-feedback-list{display:flex;flex-direction:column;gap:16px}
.clinic-feedback-item{padding-bottom:16px;border-bottom:1px solid #333}.clinic-feedback-item:last-child{border-bottom:none;padding-bottom:0}
.clinic-author{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
.clinic-author.teacher{color:#fbbf24}.clinic-author.tutor{color:#999}
.clinic-message{font-size:12px;color:#d4d4d4;line-height:1.6}
.teacher-note{background:#fff;padding:20px}
.note-label{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#667eea;margin-bottom:10px}
.note-content{font-size:13px;color:#333;line-height:1.6;font-weight:500}
.footer{background:#000;padding:24px;text-align:center}
.footer-text{font-size:10px;font-weight:600;color:#666;letter-spacing:1.2px}
</style></head><body>
<div class="report-container">
  <div class="hero">
    <div class="hero-label">Daily Report by 김효진T</div>
    <div class="hero-title">${esc(student_name)}</div>
    <div class="hero-subtitle">성장하는 매일, 변화하는 내일</div>
    <div class="hero-meta">
      <div class="meta-item"><div class="meta-label">날짜</div><div class="meta-value">${dateStr} (${dayStr})</div></div>
      <div class="meta-item"><div class="meta-label">반</div><div class="meta-value">${esc(className)}</div></div>
      <div class="meta-item"><div class="meta-label">유형</div><div class="meta-value">${session?.session_type==='clinic'?'클리닉':'정규수업'}</div></div>
      <div class="meta-item"><div class="meta-label">수업시간</div><div class="meta-value">${schedule?`${schedule.time}~${schedule.end_time}`:'-'}</div></div>
    </div>
  </div>
  <div class="content">
    <div class="section">
      <div class="section-number">00</div>
      <div class="section-title">단어 암기(App) 현황</div>
      <table class="vocab-table"><thead><tr><th>날짜</th><th>학습 내역</th></tr></thead>
      <tbody>${vocabRows}</tbody></table>
      ${streak>0?`<div class="streak-info">🔥 연속 학습 ${streak}일째</div>`:''}
    </div>
    <div class="section">
      <div class="section-number">01</div>
      <div class="section-title">출결</div>
      <div class="attendance-display">
        <div class="attendance-status ${attClass}">${attLabel}</div>
        <div class="attendance-time">${att?.late_arrival_time||schedule?.time||''}</div>
      </div>
      ${att?.late_reason?`<p style="font-size:11px;color:#666;margin-top:8px">사유: ${esc(att.late_reason)}</p>`:''}
    </div>
    <div class="section">
      <div class="section-number">02</div>
      <div class="section-title">오늘 배운 내용</div>
      ${note?.note?`<div class="content-body">${esc(note.note)}</div>`:'<p style="font-size:12px;color:#999">수업 내용이 입력되지 않았습니다.</p>'}
    </div>
    ${grade?`<div class="section">
      <div class="section-number">03</div>
      <div class="section-title">수업 태도</div>
      <div class="attitude-container">
        <div class="attitude-grade grade-${grade}">${grade}</div>
        <div class="attitude-description">${ATTITUDE_COMMENT[grade]||''}</div>
      </div>
    </div>`:''}
    ${testSlots.length>0?`<div class="section">
      <div class="section-number">04</div>
      <div class="section-title">테스트 결과</div>
      <div class="test-list">${testHtml}</div>
    </div>`:''}
    ${(dueSlots||[]).length>0||((slots||[]).filter((s:any)=>s.hw_type!=='vocab_test').length>0)?`<div class="section">
      <div class="section-number">05</div>
      <div class="section-title">과제 현황</div>
      <div class="assignment-section">
        ${checkedHtml?`<div><div class="assignment-group-title">검사 완료</div><div class="assignment-list">${checkedHtml}</div></div>`:''}
        ${newHtml?`<div><div class="assignment-group-title">신규 과제</div><div class="assignment-list">${newHtml}</div></div>`:''}
      </div>
    </div>`:''}
  </div>
  ${hasClinic?`<div class="clinic-section">
    <div class="clinic-header"><div class="clinic-badge">Clinic</div><div class="clinic-title">클리닉 학습 내역</div></div>
    <div class="clinic-feedback-list">${clinicHtml}</div>
  </div>`:''}
  <div class="teacher-note"><div class="note-label">Teacher's Note</div><div class="note-content" id="teacher-note-content">{{TEACHER_COMMENT}}</div></div>
  <div class="footer"><div class="footer-text">DEEP LEARNING · TEAM PARALLAX</div></div>
</div></body></html>`;
}
