// effect.js — 효과 적용기 (pure, DOM-free, immutable)
//
// 명세서 3.4 Effect System 구현.
// effects 배열을 받아 state에 순서대로 적용한 "새 state"를 반환한다.
// 원본 state는 절대 수정하지 않는다 (undo / save / 서버 동기화 대비).
//
// 지원 효과 타입:
//   { type: "money",  value: 120 }        누적 증감
//   { type: "stress", value: -10 }
//   { type: "rank",   value: 1 }
//   { type: "flag",   key: "joined", value: true }
//   { type: "set",    key: "money", value: 0 }   절대값 설정
//   { type: "time",   value: 2 }                 시간 진행(시간 단위) — time.js 위임

import { advanceTime } from './time.js';

// 값 범위 제한 (stress는 0~100 등). 없으면 그대로.
const CLAMPS = {
  stress: [0, 100],
  money: [0, Infinity],
  rank: [0, Infinity],
};

function clamp(field, val) {
  const range = CLAMPS[field];
  if (!range) return val;
  return Math.max(range[0], Math.min(range[1], val));
}

// 단일 효과를 state에 적용 → 새 state
function applyOne(state, effect) {
  switch (effect.type) {
    case 'money':
    case 'stress':
    case 'rank': {
      const next = (state[effect.type] ?? 0) + effect.value;
      return { ...state, [effect.type]: clamp(effect.type, next) };
    }

    case 'set': {
      return { ...state, [effect.key]: clamp(effect.key, effect.value) };
    }

    case 'flag': {
      return {
        ...state,
        flags: { ...state.flags, [effect.key]: effect.value },
      };
    }

    case 'time': {
      return advanceTime(state, effect.value);
    }

    case 'hidden': {
      // 숨은 상태 변경 (UI 비노출). rel은 인물별 중첩, boss/gov는 평면.
      if (effect.key === 'rel') {
        const who = effect.who;
        const cur = state.hidden.rel[who] ?? 0;
        return {
          ...state,
          hidden: { ...state.hidden, rel: { ...state.hidden.rel, [who]: cur + effect.value } },
        };
      }
      const cur = state.hidden[effect.key] ?? 0;
      return { ...state, hidden: { ...state.hidden, [effect.key]: cur + effect.value } };
    }

    case 'noop': {
      // 상태 변경 없이 toast만 띄우는 용도
      return state;
    }

    default:
      console.warn(`[effect] 알 수 없는 효과 타입: "${effect.type}" — 건너뜀`);
      return state;
  }
}

// 효과에 toast 문구가 붙어있으면 큐에 쌓는다 (세계의 시선으로 쓴 문장).
function withToast(state, effect) {
  if (!effect.toast) return state;
  return {
    ...state,
    toasts: [...(state.toasts ?? []), { text: effect.toast, tone: effect.tone ?? 'neutral' }],
  };
}

/**
 * 효과 배열을 순서대로 적용한 새 state 반환.
 * 각 효과는 상태 변경 + (있으면) toast 큐 적재를 함께 수행한다.
 * @param {object} state - 현재 GameState
 * @param {Array|undefined} effects - 효과 배열
 * @returns {object} 새 state
 */
export function applyEffects(state, effects) {
  if (!effects || effects.length === 0) return state;
  return effects.reduce((acc, effect) => {
    const changed = applyOne(acc, effect);
    return withToast(changed, effect);
  }, state);
}