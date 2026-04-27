"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Timer, Trash2 } from "lucide-react";
import { getClinicQueue, updateClinicStatus, deleteClinicEntry } from "@/lib/database-service";

type ClinicEntry = {
  id: string;
  student_name: string;
  topic: string;
  status: "waiting" | "in-progress" | "completed";
  created_at: string;
  started_at?: string;
  completed_at?: string;
};

function getDurationMinutes(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export default function AdminClinicPage() {
  const [queue, setQueue] = useState<ClinicEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "waiting" | "in-progress" | "completed">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; student: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const data = await getClinicQueue();
      setQueue((data || []) as ClinicEntry[]);
    } catch (err) {
      console.error("clinic load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 15000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const handleStatusChange = async (id: string, newStatus: "waiting" | "in-progress" | "completed") => {
    setUpdatingId(id);
    try {
      await updateClinicStatus(id, newStatus);
      await loadQueue();
    } catch (err: unknown) {
      alert("상태 변경 실패: " + (err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteClinicEntry(deleteConfirm.id);
      await loadQueue();
      setDeleteConfirm(null);
    } catch (err: unknown) {
      alert("삭제 실패: " + (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = queue.filter(q => filter === "all" || q.status === filter);
  const waitingCount = queue.filter(q => q.status === "waiting").length;
  const inProgressCount = queue.filter(q => q.status === "in-progress").length;

  const statusLabel = (s: string) => {
    if (s === "waiting") return "대기 중";
    if (s === "in-progress") return "상담 중";
    return "완료";
  };

  const statusColor = (s: string) => {
    if (s === "waiting") return "bg-amber-50 text-amber-600 border-amber-200";
    if (s === "in-progress") return "bg-blue-50 text-blue-600 border-blue-200";
    return "bg-success/5 text-success border-success/20";
  };

  const completedItems = queue.filter(q => q.status === "completed" && q.started_at && q.completed_at);
  const totalMinutes = completedItems.reduce((acc, q) => {
    const dur = getDurationMinutes(q.started_at, q.completed_at);
    return acc + (dur || 0);
  }, 0);

  return (
    <div className="p-6 md:p-12 pb-20 max-w-4xl mx-auto overflow-y-auto custom-scrollbar h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl text-foreground serif font-black">클리닉 대기 관리</h1>
          <p className="text-[14px] text-accent mt-2 font-medium">학생 클리닉 접수 현황 · 15초 자동 갱신 · 상담 시간 자동 기록</p>
        </div>
        <div className="flex items-center gap-3">
          {waitingCount > 0 && (
            <div className="flex items-center gap-2 text-[13px] font-bold text-error bg-error/5 border border-error/10 px-4 py-2 rounded-xl">
              <AlertTriangle size={15} strokeWidth={2.5} />
              대기 {waitingCount}명 {inProgressCount > 0 && `· 상담 중 ${inProgressCount}명`}
            </div>
          )}
          <button
            onClick={() => { setIsLoading(true); loadQueue(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 text-[12px] font-black text-accent hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "전체 접수", count: queue.length, color: "text-foreground" },
          { label: "대기 중", count: waitingCount, color: "text-amber-600" },
          { label: "상담 중", count: inProgressCount, color: "text-blue-600" },
          { label: "오늘 누적 상담", count: `${totalMinutes}분`, color: "text-success" },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 border border-foreground/5 text-center">
            <div className={`text-xl font-black ${s.color}`}>{s.count}</div>
            <div className="text-[10px] font-bold text-accent mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "waiting", "in-progress", "completed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl text-[12px] font-black transition-all ${filter === f ? "bg-foreground text-background shadow" : "bg-accent-light text-accent hover:text-foreground"}`}>
            {f === "all" ? "전체" : statusLabel(f)}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="py-20 text-center text-accent animate-pulse font-bold">대기 목록을 불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center glass rounded-[2.5rem] border border-foreground/5">
          <CheckCircle size={32} className="text-success mx-auto mb-3 opacity-40" />
          <p className="text-accent font-bold opacity-50">현재 해당하는 접수가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item, idx) => {
            const duration = getDurationMinutes(item.started_at, item.completed_at);
            const inProgressDuration = item.status === "in-progress" && item.started_at
              ? Math.round((Date.now() - new Date(item.started_at).getTime()) / 60000)
              : null;

            return (
              <div key={item.id}
                className={`glass rounded-[1.5rem] border transition-all ${
                  item.status === "completed" ? "border-foreground/5 opacity-60" :
                  item.status === "in-progress" ? "border-blue-200 shadow-md" :
                  "border-amber-200 shadow-[0_4px_24px_rgba(245,158,11,0.08)]"
                }`}>
                <button className="w-full flex items-center justify-between p-6 text-left gap-4"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-[0.9rem] flex items-center justify-center shrink-0 font-black text-[14px] ${
                      item.status === "completed" ? "bg-success/10 text-success" :
                      item.status === "in-progress" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-foreground text-[15px]">{item.student_name}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${statusColor(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                        {duration !== null && (
                          <span className="text-[10px] font-bold text-success bg-success/5 border border-success/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Timer size={10} /> {duration}분
                          </span>
                        )}
                        {inProgressDuration !== null && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">
                            <Timer size={10} /> {inProgressDuration}분 경과
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-accent mt-0.5 truncate max-w-[180px] md:max-w-sm">
                        {item.topic}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-accent hidden md:block">
                      {new Date(item.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {item.status === "waiting" ? <Clock size={16} className="text-amber-500" /> :
                     item.status === "in-progress" ? <Clock size={16} className="text-blue-500 animate-pulse" /> :
                     <CheckCircle size={16} className="text-success" />}
                    {expandedId === item.id ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-accent" />}
                  </div>
                </button>

                {expandedId === item.id && (
                  <div className="px-6 pb-6 border-t border-foreground/5 pt-5 space-y-5">
                    <div className="bg-background rounded-2xl px-5 py-4 border border-foreground/5">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">사전 질문 내용</p>
                      <p className="text-[14px] text-foreground font-medium leading-relaxed">{item.topic}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-accent-light rounded-xl px-3 py-3">
                        <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">접수</p>
                        <p className="text-[12px] font-black text-foreground">
                          {new Date(item.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className={`rounded-xl px-3 py-3 ${item.started_at ? "bg-blue-50" : "bg-accent-light/50"}`}>
                        <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">상담 시작</p>
                        <p className="text-[12px] font-black text-foreground">
                          {item.started_at
                            ? new Date(item.started_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </p>
                      </div>
                      <div className={`rounded-xl px-3 py-3 ${item.completed_at ? "bg-success/5" : "bg-accent-light/50"}`}>
                        <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">완료 {duration !== null ? `(${duration}분)` : ""}</p>
                        <p className="text-[12px] font-black text-foreground">
                          {item.completed_at
                            ? new Date(item.completed_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      {item.status === "waiting" && (
                        <button
                          onClick={() => handleStatusChange(item.id, "in-progress")}
                          disabled={updatingId === item.id}
                          className="flex-1 h-11 bg-blue-600 text-white text-[13px] font-black rounded-xl shadow hover:-translate-y-0.5 disabled:opacity-40 transition-all"
                        >
                          {updatingId === item.id ? "처리 중..." : "상담 시작"}
                        </button>
                      )}
                      {item.status === "in-progress" && (
                        <button
                          onClick={() => handleStatusChange(item.id, "completed")}
                          disabled={updatingId === item.id}
                          className="flex-1 h-11 bg-success text-white text-[13px] font-black rounded-xl shadow hover:-translate-y-0.5 disabled:opacity-40 transition-all"
                        >
                          {updatingId === item.id ? "처리 중..." : "클리닉 완료"}
                        </button>
                      )}
                      {item.status !== "waiting" && (
                        <button
                          onClick={() => handleStatusChange(item.id, "waiting")}
                          disabled={updatingId === item.id}
                          className="h-11 px-5 bg-amber-50 text-amber-600 text-[12px] font-black rounded-xl border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-40"
                        >
                          대기로 되돌리기
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm({ id: item.id, student: item.student_name })}
                        className="h-11 px-4 bg-error/8 text-error text-[12px] font-black rounded-xl border border-error/15 hover:bg-error hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <Trash2 size={13} strokeWidth={2.5} /> 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="glass w-full max-w-sm rounded-[2rem] border border-red-100 shadow-2xl overflow-hidden">
            <div className="p-7 border-b border-red-50">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-[16px] font-black text-foreground">클리닉 접수 삭제</h3>
              <p className="text-[13px] font-bold text-foreground mt-3 bg-red-50 px-4 py-3 rounded-xl">{deleteConfirm.student} 학생</p>
              <p className="text-[11px] text-accent/70 mt-3">이 클리닉 접수를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <div className="p-5 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">
                취소
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-black hover:bg-red-600 transition-all disabled:opacity-40">
                {deleting ? "삭제 중..." : "삭제 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
