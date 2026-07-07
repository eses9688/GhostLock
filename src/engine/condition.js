// condition.js — 조건 평가기 (pure, DOM-free)
//
// 명세서 3.3 Condition System 확장 구현.
// 이벤트의 condition 객체를 받아 현재 state에서 만족하는지 boolean 반환.
//
// 지원 형식:
//   { rank: ">= 2" }              숫자 비교 (state의 최상위 숫자 필드 대상)
//   { money: "< 500" }
//   { stress: ">= 80" }
//   { flags: ["joined", "!mail_opened"] }   flag 존재/부재 검사
//   { time: { day: ">= 3" } }               중첩 시간 조건
//   { all: [ ...conds ] } / { any: [ ...conds ] }   논리 결합

const COMPARATORS = {
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '>':  (a, b) => a > b,
  '<':  (a, b) => a < b,
};

// ">= 2" 같은 문자열을 파싱해서 [비교함수, 숫자] 반환
function parseComparison(expr) {
  const match = String(expr).trim().match(/^(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) {
    console.warn(`[condition] 파싱 불가한 비교식: "${expr}" — 무시하고 통과 처리`);
    return null;
  }
  return [COMPARATORS[match[1]], Number(match[2])];
}

// 숫자 필드 비교 (money, stress, rank 등)
function checkNumeric(actual, expr) {
  const parsed = parseComparison(expr);
  if (!parsed) return true; // 파싱 실패 시 안전하게 통과 (게임 안 멈춤)
  const [cmp, target] = parsed;
  return cmp(Number(actual ?? 0), target);
}

// flag 검사: "joined" → 참이어야, "!joined" → 거짓이어야
function checkFlag(flagExpr, flags = {}) {
  const negate = flagExpr.startsWith('!');
  const key = negate ? flagExpr.slice(1) : flagExpr;
  const present = Boolean(flags[key]);
  return negate ? !present : present;
}

// 시간 조건: { day: ">= 3", hour: "< 22" }
function checkTime(timeCond, stateTime = {}) {
  return Object.entries(timeCond).every(([unit, expr]) =>
    checkNumeric(stateTime[unit], expr)
  );
}

/**
 * 조건 객체가 현재 state에서 만족되는지 평가.
 * @param {object|undefined} condition - 이벤트의 condition (없으면 항상 true)
 * @param {object} state - 현재 GameState
 * @returns {boolean}
 */
export function evaluateCondition(condition, state) {
  if (!condition) return true;

  return Object.entries(condition).every(([key, value]) => {
    switch (key) {
      case 'flags':
        return value.every((f) => checkFlag(f, state.flags));
      case 'time':
        return checkTime(value, state.time);
      case 'all':
        return value.every((c) => evaluateCondition(c, state));
      case 'any':
        return value.some((c) => evaluateCondition(c, state));
      default:
        // 그 외는 state의 숫자 필드로 간주 (money, stress, rank...)
        return checkNumeric(state[key], value);
    }
  });
}
