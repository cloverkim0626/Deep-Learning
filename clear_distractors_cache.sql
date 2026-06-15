-- word_distractors 캐시 전체 초기화 (잘못된 유사어 오답 제거)
-- 프롬프트 v4 업그레이드 후 재생성을 위해
TRUNCATE TABLE word_distractors;

-- 결과 확인
SELECT COUNT(*) AS remaining FROM word_distractors;
