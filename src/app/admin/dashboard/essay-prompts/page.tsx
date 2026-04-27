"use client";

import { useState, useEffect } from "react";
import { getEssayPromptTemplates, upsertEssayPromptTemplate, deleteEssayPromptTemplate } from "@/lib/database-service";
import { Plus, Save, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

type Template = {
  id: string; type_key: string; display_name: string;
  question_prompt: string; scoring_prompt: string;
  sort_order: number; is_active: boolean; updated_at: string;
};

const EMPTY: Omit<Template, "id" | "updated_at"> = {
  type_key: "", display_name: "", question_prompt: "", scoring_prompt: "", sort_order: 99, is_active: true
};

export default function EssayPromptsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, Partial<Template>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addNew, setAddNew] = useState(false);
  const [newTpl, setNewTpl] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    try { setTemplates(await getEssayPromptTemplates()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = (id: string, field: string, val: string | boolean) =>
    setEditing(p => ({ ...p, [id]: { ...p[id], [field]: val } }));

  const save = async (tpl: Template) => {
    setSaving(tpl.id);
    try {
      const merged = { ...tpl, ...(editing[tpl.id] || {}) };
      await upsertEssayPromptTemplate(merged);
      setEditing(p => { const c = { ...p }; delete c[tpl.id]; return c; });
      await load();
    } finally { setSaving(null); }
  };

  const del = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await deleteEssayPromptTemplate(id);
    await load();
  };

  const toggle = async (tpl: Template) => {
    await upsertEssayPromptTemplate({ ...tpl, is_active: !tpl.is_active });
    await load();
  };

  const createNew = async () => {
    if (!newTpl.type_key || !newTpl.display_name) { alert("유형 키와 표시명을 입력하세요"); return; }
    setSaving("new");
    try {
      await upsertEssayPromptTemplate(newTpl);
      setNewTpl({ ...EMPTY });
      setAddNew(false);
      await load();
    } finally { setSaving(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-accent" size={32} />
    </div>
  );

  const val = (tpl: Template, f: keyof Template) =>
    editing[tpl.id]?.[f] !== undefined ? editing[tpl.id][f] : tpl[f];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-foreground">프롬프트 관리</h1>
          <p className="text-[12px] text-accent/60 mt-1">유형별 문제생성·채점 프롬프트 편집 · {`{sentence}`} {`{extra_condition}`} {`{question_text}`} {`{model_answer}`} {`{student_answer}`} placeholder 사용 가능</p>
        </div>
        <button
          onClick={() => setAddNew(v => !v)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all"
        >
          <Plus size={15} strokeWidth={3} /> 유형 추가
        </button>
      </div>

      {/* 새 유형 추가 폼 */}
      {addNew && (
        <div className="bg-accent-light/40 rounded-2xl p-5 mb-4 border border-foreground/10">
          <p className="text-[12px] font-black text-accent uppercase tracking-widest mb-3">새 유형</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-bold text-accent/60 block mb-1">유형 키 (영문)</label>
              <input value={newTpl.type_key} onChange={e => setNewTpl(p => ({ ...p, type_key: e.target.value }))}
                placeholder="조건부영작" className="w-full h-9 px-3 rounded-lg border border-foreground/10 bg-white text-[13px] font-bold outline-none focus:border-foreground/30" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-accent/60 block mb-1">표시명</label>
              <input value={newTpl.display_name} onChange={e => setNewTpl(p => ({ ...p, display_name: e.target.value }))}
                placeholder="조건부 영작" className="w-full h-9 px-3 rounded-lg border border-foreground/10 bg-white text-[13px] font-bold outline-none focus:border-foreground/30" />
            </div>
          </div>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-[11px] font-bold text-accent/60 block mb-1">문제생성 프롬프트</label>
              <textarea value={newTpl.question_prompt} onChange={e => setNewTpl(p => ({ ...p, question_prompt: e.target.value }))}
                rows={5} placeholder="{sentence}, {extra_condition} placeholder 사용 가능"
                className="w-full px-3 py-2 rounded-lg border border-foreground/10 bg-white text-[12px] font-mono outline-none focus:border-foreground/30 resize-y" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-accent/60 block mb-1">채점 프롬프트</label>
              <textarea value={newTpl.scoring_prompt} onChange={e => setNewTpl(p => ({ ...p, scoring_prompt: e.target.value }))}
                rows={5} placeholder="{question_text}, {model_answer}, {student_answer} placeholder 사용 가능"
                className="w-full px-3 py-2 rounded-lg border border-foreground/10 bg-white text-[12px] font-mono outline-none focus:border-foreground/30 resize-y" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createNew} disabled={saving === "new"}
              className="h-9 px-5 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-40 flex items-center gap-1.5">
              {saving === "new" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} 저장
            </button>
            <button onClick={() => setAddNew(false)} className="h-9 px-4 rounded-xl border border-foreground/10 text-[13px] font-bold text-accent hover:bg-foreground/5 transition-all">취소</button>
          </div>
        </div>
      )}

      {/* 유형 목록 */}
      <div className="space-y-3">
        {templates.map(tpl => {
          const isDirty = Object.keys(editing[tpl.id] || {}).length > 0;
          const isOpen = expanded === tpl.id;
          return (
            <div key={tpl.id} className={`rounded-2xl border overflow-hidden transition-all ${tpl.is_active ? 'border-foreground/10 bg-white' : 'border-foreground/5 bg-foreground/3 opacity-60'}`}>
              {/* 헤더 */}
              <div className="flex items-center gap-3 px-5 py-3.5">
                <button onClick={() => toggle(tpl)} className="shrink-0">
                  {tpl.is_active
                    ? <ToggleRight size={20} className="text-emerald-500" />
                    : <ToggleLeft size={20} className="text-foreground/30" />}
                </button>
                <span className="text-[14px] font-black text-foreground">{tpl.display_name}</span>
                <span className="text-[10px] text-accent/40 font-mono">{tpl.type_key}</span>
                {isDirty && <span className="ml-auto text-[10px] text-amber-500 font-black">미저장</span>}
                <button onClick={() => setExpanded(isOpen ? null : tpl.id)} className="ml-auto text-accent/40 hover:text-foreground transition-colors">
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* 편집 영역 */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-foreground/5 pt-4 space-y-4">
                  <div>
                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest block mb-1.5">문제생성 프롬프트</label>
                    <textarea
                      value={val(tpl, 'question_prompt') as string}
                      onChange={e => patch(tpl.id, 'question_prompt', e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2.5 rounded-xl border border-foreground/10 bg-white/80 text-[12px] font-mono outline-none focus:border-indigo-300 resize-y leading-relaxed"
                    />
                    <p className="text-[10px] text-accent/40 mt-1">Placeholders: {`{sentence}`} · {`{extra_condition}`}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-amber-500 uppercase tracking-widest block mb-1.5">채점 프롬프트</label>
                    <textarea
                      value={val(tpl, 'scoring_prompt') as string}
                      onChange={e => patch(tpl.id, 'scoring_prompt', e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2.5 rounded-xl border border-foreground/10 bg-white/80 text-[12px] font-mono outline-none focus:border-amber-300 resize-y leading-relaxed"
                    />
                    <p className="text-[10px] text-accent/40 mt-1">Placeholders: {`{question_text}`} · {`{model_answer}`} · {`{student_answer}`}</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => save(tpl)} disabled={saving === tpl.id}
                      className="h-9 px-5 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-40 flex items-center gap-1.5">
                      {saving === tpl.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} 저장
                    </button>
                    <button onClick={() => del(tpl.id)}
                      className="h-9 px-4 rounded-xl border border-red-200 text-[13px] font-bold text-red-400 hover:bg-red-50 transition-all flex items-center gap-1.5">
                      <Trash2 size={13} /> 삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
