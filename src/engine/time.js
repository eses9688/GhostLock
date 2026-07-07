// time.js — 시간 시스템 (pure, DOM-free)
//
// 명세서 3.5 Time System 구현.
// - 시간은 자동으로 흐르지 않음. 행동(선택)할 때 소모된다.
// - 24시간(hour)을 초과하면 day가 증가하고 hour가 롤오버된다.

const HOURS_PER_DAY = 24;

/**
 * 현재 state에서 시간을 지정한 시간(hour)만큼 진행시킨 새 state 반환.
 * @param {object} state - 현재 GameState (state.time = { day, hour })
 * @param {number} hours - 진행시킬 시간
 * @returns {object} 새 state
 */
export function advanceTime(state, hours = 0) {
  if (!hours) return state;

  const t = state.time ?? { day: 1, hour: 0 };
  const totalHours = t.hour + hours;
  const dayInc = Math.floor(totalHours / HOURS_PER_DAY);
  const newHour = ((totalHours % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;

  return {
    ...state,
    time: {
      day: t.day + dayInc,
      hour: newHour,
    },
  };
}

// UI 표시용 포맷: "DAY 3 · 14:00"
export function formatTime(time) {
  const { day = 1, hour = 0 } = time ?? {};
  const hh = String(Math.floor(hour)).padStart(2, '0');
  const mm = String(Math.round((hour % 1) * 60)).padStart(2, '0');
  return `DAY ${day} · ${hh}:${mm}`;
}
