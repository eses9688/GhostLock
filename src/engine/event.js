// event.js — 이벤트 엔진 (pure, DOM-free)
//
// 명세서 3.2 Event System + 2.1 기본 루프 구현.
// 게임 진행의 핵심: 이벤트 선택 → 효과 적용 → 다음 이벤트 결정.

import { evaluateCondition } from './condition.js';
import { applyEffects } from './effect.js';
import { advanceTime } from './time.js';

/**
 * 이벤트 배열을 검증하고 id로 조회 가능한 Map으로 인덱싱.
 * 잘못된 이벤트는 콘솔 경고 후 제외 → 하나 깨져도 게임 전체는 산다.
 */
export function buildEventMap(rawEvents) {
  const map = new Map();
  const errors = [];

  for (const evt of rawEvents) {
    const problems = validateEvent(evt);
    if (problems.length) {
      errors.push(`[${evt?.id ?? '?'}] ${problems.join(', ')}`);
      continue;
    }
    if (map.has(evt.id)) {
      errors.push(`[${evt.id}] 중복 id`);
      continue;
    }
    map.set(evt.id, evt);
  }

  // 참조 무결성 검사 (kind별)
  for (const evt of map.values()) {
    const kind = evt.kind ?? 'story';
    if (kind === 'story') {
      for (const choice of evt.choices ?? []) {
        if (choice.next && !map.has(choice.next)) {
          errors.push(`[${evt.id}] 선택지가 없는 이벤트를 가리킴: "${choice.next}"`);
        }
        for (const d of choice.deliver ?? []) {
          if (!map.has(d)) errors.push(`[${evt.id}] deliver 대상 없음: "${d}"`);
        }
      }
      for (const d of evt.deliver ?? []) {
        if (!map.has(d)) errors.push(`[${evt.id}] deliver 대상 없음: "${d}"`);
      }
    } else if (kind === 'mail') {
      if (evt.action?.next && !map.has(evt.action.next)) {
        errors.push(`[${evt.id}] 메일 action이 없는 이벤트를 가리킴: "${evt.action.next}"`);
      }
    } else if (kind === 'chat') {
      if (evt.jump && !map.has(evt.jump)) errors.push(`[${evt.id}] chat jump 대상 없음: "${evt.jump}"`);
      for (const step of evt.messages ?? []) {
        for (const c of step.choices ?? []) {
          if (c.next && !map.has(c.next)) errors.push(`[${evt.id}] chat 선택지가 없는 이벤트를 가리킴: "${c.next}"`);
        }
      }
    }
  }

  return { map, errors };
}

// 단일 이벤트 스키마 검증 (kind별)
function validateEvent(evt) {
  const problems = [];
  if (!evt || typeof evt !== 'object') return ['이벤트가 객체가 아님'];
  if (!evt.id) problems.push('id 없음');
  const kind = evt.kind ?? 'story';
  if (kind === 'story') {
    if (typeof evt.text !== 'string') problems.push('text 없음');
    if (!evt.ending && (!Array.isArray(evt.choices) || evt.choices.length === 0)) {
      problems.push('choices 없음 (엔딩이 아니면 필수)');
    }
  } else if (kind === 'mail') {
    if (!evt.sender) problems.push('mail sender 없음');
    if (typeof evt.body !== 'string') problems.push('mail body 없음');
  } else if (kind === 'chat') {
    if (!evt.sender) problems.push('chat sender 없음');
    if (!Array.isArray(evt.messages) || evt.messages.length === 0) problems.push('chat messages 없음');
  } else {
    problems.push(`알 수 없는 kind: ${kind}`);
  }
  return problems;
}

/**
 * 현재 state에서 등장 조건을 만족하는 이벤트들을 반환.
 */
export function findEligibleEvents(eventMap, state) {
  return [...eventMap.values()].filter((evt) =>
    evaluateCondition(evt.condition, state)
  );
}

/**
 * 이벤트에 "진입"할 때: 자동 효과를 적용하고 history에 기록한 새 state 반환.
 * @returns {{ state, deliver }}
 */
export function enterEvent(state, event) {
  let next = applyEffects(state, event.effects);
  next = {
    ...next,
    currentEventId: event.id,
    history: [...next.history, event.id],
  };
  return { state: next, deliver: event.deliver ?? [] };
}

/**
 * 플레이어가 선택지를 골랐을 때의 결과 계산.
 * @returns {{ state, nextEventId, timeAdvanced, deliver }}
 */
export function chooseOption(state, event, choiceIndex) {
  const choice = event.choices?.[choiceIndex];
  if (!choice) {
    console.warn(`[event] 잘못된 선택 index: ${choiceIndex} in ${event.id}`);
    return { state, nextEventId: null, timeAdvanced: false, deliver: [] };
  }

  let next = state;
  next = applyEffects(next, choice.effects);
  const timeAdvanced = Boolean(choice.cost);
  if (choice.cost) next = advanceTime(next, choice.cost);

  return {
    state: next,
    nextEventId: choice.next ?? null,
    timeAdvanced,
    deliver: choice.deliver ?? [],
  };
}

/**
 * 선택지가 현재 보여질 수 있는지 (condition 만족 + 잠금 여부).
 */
export function isChoiceAvailable(choice, state) {
  return evaluateCondition(choice.condition, state);
}