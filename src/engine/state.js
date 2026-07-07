// state.js — 게임 상태 시스템 (pure, DOM-free)
//
// 명세서 3.1 State System 구현.
// GameState의 생성 / 정규화를 담당한다.
// 실제 초기값은 data/initialState.json에서 주입받되,
// 누락 필드가 있으면 안전한 기본값으로 채운다.

export const DEFAULT_STATE = {
  time: { day: 1, hour: 8 },
  money: 0,
  stress: 0,
  rank: 0,
  flags: {},
};

/**
 * 부분 상태(초기값 JSON)를 받아 완전한 GameState로 정규화.
 * 누락된 필드는 DEFAULT_STATE로 채운다.
 * @param {object} partial
 * @returns {object} GameState
 */
export function createState(partial = {}) {
  const h = partial.hidden ?? {};
  return {
    time: { ...DEFAULT_STATE.time, ...(partial.time ?? {}) },
    money: partial.money ?? DEFAULT_STATE.money,
    stress: partial.stress ?? DEFAULT_STATE.stress,
    rank: partial.rank ?? DEFAULT_STATE.rank,
    flags: { ...DEFAULT_STATE.flags, ...(partial.flags ?? {}) },
    // currentEventId: 현재 진행 중인 이벤트. 진행 위치 추적용.
    currentEventId: partial.currentEventId ?? null,
    // history: 방문한 이벤트 id 로그 (Log 패널 / 되돌리기용)
    history: partial.history ?? [],

    // ── 숨은 상태 (UI에 숫자로 절대 노출하지 않음) ──
    // 세계가 플레이어를 어떻게 보는지 — 토스트 문구로만 간접 전달된다.
    hidden: {
      rel: { ...(h.rel ?? {}) },   // 인물별 관계: { REN: 0 }
      boss: h.boss ?? 0,           // 보스 신뢰(양수) ↔ 의심(음수)
      gov: h.gov ?? 0,             // 정부 주시도 (높을수록 위험)
    },

    // ── 토스트 큐 (휘발성; UI가 소비 후 비운다) ──
    // [{ text, tone }]
    toasts: partial.toasts ?? [],

    // ── MAIL: 도착한 메일 아카이브 ── [{ id, arrivedAt, read }]
    inbox: partial.inbox ?? [],
    // ── CHAT: 인물별 대화 스레드 ──
    // { REN: { messages: [...], read, pending: {eventId, deadline, penalized}|null } }
    threads: partial.threads ?? {},
    // ── 안 읽음 배지 ── { mail: N, chat: { REN: N } }
    unread: partial.unread ?? { mail: 0, chat: {} },
  };
}

// 절대 시간(정렬/만료 계산용): day*24 + hour
export function absHour(time) {
  return (time?.day ?? 1) * 24 + (time?.hour ?? 0);
}

// state를 직렬화 가능한 순수 객체로 (세이브용).
// toasts는 휘발성이므로 세이브에서 제외한다.
export function serializeState(state) {
  const { toasts, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
}