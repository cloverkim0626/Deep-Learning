export type Role = 'ADMIN' | 'STUDENT';

export interface User {
  id: string;
  role: Role;
  name: string;
  classId?: string; 
  school?: string;
  grade?: number;
  gender?: 'M' | 'F' | 'OTHER';
  phone?: string;
  pastGrade?: string;
  counselingNotes?: string;
  createdAt: Date;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
}

// -------------------------------------
// 어휘 DB 관리 시스템 (Word DB Scheme)
// -------------------------------------
export interface Word {
  id: string;
  setId: string; // Ex: "수능특강 1강"
  word: string;
  partOfSpeech: string;
  koreanMeaning: string;
  context: string;
  synonyms: string[];
  antonyms: string[];
  grammarTip: string;
}

export interface WordSet {
  id: string;
  title: string;
  description?: string;
  words: Word[];
}

export interface StudentWordMastery {
  studentId: string;
  wordId: string;
  errorCount: number;         // 누적 오답 횟수
  encounters: number;         // 마주친 횟수
  lastErrorDate?: Date;
  status: 'LEARNING' | 'MASTERED'; 
}

export interface StudentErrorLog {
  id: string;
  studentId: string;
  questionId: string;         // wordId 혹은 서술형 essayId
  questionType: 'vocab' | 'grammar' | 'reading' | 'writing';
  errorType: string;          // E01-E12, vocab_type_A 등
  studentAnswer: string;
  correctAnswer: string;
  context: string;
  timestamp: Date;
  difficultyTier: 1 | 2 | 3 | 4;
}

// -------------------------------------
// 기타 시스템 (AI, QnA, Clinic, Notice)
// -------------------------------------
export interface ChatMessage {
  id: string;
  studentId: string;
  role: 'user' | 'assistant';
  content: string;
  contextData?: any; 
  createdAt: Date;
}

export interface QnABoard {
  id: string;
  studentId: string;
  teacherId?: string;
  title: string;
  content: string;
  reply?: string;
  status: 'PENDING' | 'ANSWERED';
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicQueue {
  id: string;
  studentId: string;
  clinicType: 'PARSING' | 'GRAMMAR' | 'VOCAB' | 'READING';
  materialDetails: string;
  status: 'WAITING' | 'CALLED' | 'COMPLETED';
  createdAt: Date;
}

export interface Notice {
  id: string;
  teacherId: string;
  title: string;
  content: string;
  createdAt: Date;
}
