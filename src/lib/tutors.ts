// src/lib/tutors.ts
// 현재: 하드코딩
// 향후: 어드민 설정 페이지에서 DB 'tutors' 테이블로 관리 가능하도록 마이그레이션 예정

export type Tutor = {
  id: string;
  name: string;
  is_head: boolean; // true = 강사(김효진T), false = 조교
};

export const TUTORS: Tutor[] = [
  { id: 'head',  name: '김효진T', is_head: true  },
  { id: 'tutor1', name: '영례T',   is_head: false },
  { id: 'tutor2', name: '온유T',   is_head: false },
  // 새 조교 추가 시 여기에 입력 (향후 DB로 이관 예정)
];

export const HEAD_TEACHER = TUTORS.find(t => t.is_head)!;
export const TUTOR_NAMES = TUTORS.map(t => t.name);
