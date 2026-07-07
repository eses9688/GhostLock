// inbox.js — 메일/채팅 도착·만료 엔진 (pure, DOM-free)
//
// MAIL = 일/스토리. 시간이 멈춘 아카이브. 언제 읽어도 됨.
// CHAT = 인간 관계. 유효기간 있음. 방치하면 상대가 대화를 닫고 관계가 식는다.
//
// 엔진은 상태만 바꾸고 toast 문구를 큐에 쌓는다 (UI는 몰라도 됨).

import { absHour } from './state.js';
import { applyEffects } from './effect.js';

/**
 * story 이벤트의 deliver 목록을 처리해 메일/채팅을 "도착"시킨다.
 * @param {object} state
 * @param {string[]} deliverIds
 * @param {Map} eventMap
 * @returns {object} 새 state
 */
export function deliver(state, deliverIds, eventMap) {
  if (!deliverIds?.length) return state;
  let next = state;
  for (const id of deliverIds) {
    const evt = eventMap.get(id);
    if (!evt) { console.warn(`[inbox] deliver 대상 없음: ${id}`); continue; }
    if (evt.kind === 'mail') next = deliverMail(next, evt);
    else if (evt.kind === 'chat') next = deliverChat(next, evt);
    else if (evt.kind === 'news') next = deliverNews(next, evt);
    else console.warn(`[inbox] deliver 불가한 kind: ${evt.kind} (${id})`);
  }
  return next;
}

function deliverMail(state, evt) {
  if (state.inbox.some((m) => m.id === evt.id)) return state; // 중복 방지
  return {
    ...state,
    inbox: [{ id: evt.id, arrivedAt: absHour(state.time), read: false }, ...state.inbox],
    unread: { ...state.unread, mail: state.unread.mail + 1 },
  };
}

function deliverNews(state, evt) {
  // 이미 발행됐거나 예약돼 있으면 무시
  if (state.news.some((n) => n.id === evt.id)) return state;
  if ((state.pendingNews ?? []).some((n) => n.id === evt.id)) return state;

  const now = absHour(state.time);
  // 발행 지연: delayDays(일) 또는 delayHours(시간). 없으면 즉시 발행.
  const delay = (evt.delayDays ?? 0) * 24 + (evt.delayHours ?? 0);

  if (delay > 0) {
    // 예약: 사건 발생 시각(occurredAt)을 기록해두면 "지난 X일" 표현에 쓸 수 있다.
    return {
      ...state,
      pendingNews: [
        ...(state.pendingNews ?? []),
        { id: evt.id, publishAt: now + delay, occurredAt: now },
      ],
    };
  }
  // 즉시 발행
  return publishNews(state, evt.id, now);
}

// 뉴스를 실제로 inbox(news)에 올리고 배지를 올린다.
function publishNews(state, id, occurredAt) {
  if (state.news.some((n) => n.id === id)) return state;
  return {
    ...state,
    news: [{ id, arrivedAt: absHour(state.time), occurredAt, read: false }, ...state.news],
    unread: { ...state.unread, news: (state.unread.news ?? 0) + 1 },
  };
}

/**
 * 시간이 흐른 뒤 호출. 발행 시각이 된 예약 뉴스를 실제로 등장시킨다.
 * @returns {{ state, published: [{id, occurredAt}] }} published: 이번에 발행된 뉴스(알림용)
 */
export function checkScheduledNews(state) {
  const now = absHour(state.time);
  const pending = state.pendingNews ?? [];
  if (pending.length === 0) return { state, published: [] };

  const due = pending.filter((p) => now >= p.publishAt);
  if (due.length === 0) return { state, published: [] };

  let next = state;
  for (const p of due) {
    next = publishNews(next, p.id, p.occurredAt);
  }
  next = { ...next, pendingNews: pending.filter((p) => now < p.publishAt) };
  return { state: next, published: due.map((p) => ({ id: p.id, occurredAt: p.occurredAt })) };
}

function deliverChat(state, evt) {
  const who = evt.sender;
  const thread = state.threads[who] ?? { messages: [], read: true, pending: null };
  const deadline = absHour(state.time) + (evt.expiresIn ?? 6);
  const incoming = (evt.messages ?? [])
    .filter((m) => m.from && m.text)
    .map((m) => ({ from: m.from, text: m.text }));
  const chatUnread = { ...state.unread.chat, [who]: (state.unread.chat[who] ?? 0) + 1 };

  return {
    ...state,
    threads: {
      ...state.threads,
      [who]: {
        ...thread,
        messages: [...thread.messages, ...incoming],
        read: false,
        pending: { eventId: evt.id, deadline, penalized: false },
      },
    },
    unread: { ...state.unread, chat: chatUnread },
  };
}

/**
 * 시간이 흐른 뒤 호출. 유효기간 지난 미응답 채팅을 "무시됨"으로 처리한다.
 */
export function checkExpiries(state, eventMap) {
  const now = absHour(state.time);
  let next = state;

  for (const [who, thread] of Object.entries(state.threads)) {
    const p = thread.pending;
    if (!p || p.penalized) continue;
    if (now < p.deadline) continue;

    const evt = eventMap.get(p.eventId);
    const penalty = evt?.ignorePenalty;
    const effects = [];
    if (penalty?.rel != null) effects.push({ type: 'hidden', key: 'rel', who, value: penalty.rel });
    if (penalty?.flag) effects.push({ type: 'flag', key: penalty.flag, value: true });

    const toastText = penalty?.toast ?? `${evt?.sender ?? who} 님이 답장을 기다리다 대화를 닫았습니다.`;
    if (effects.length) {
      effects[effects.length - 1] = { ...effects[effects.length - 1], toast: toastText, tone: 'dim' };
    } else {
      effects.push({ type: 'noop', toast: toastText, tone: 'dim' });
    }
    next = applyEffects(next, effects);

    next = {
      ...next,
      threads: {
        ...next.threads,
        [who]: {
          ...next.threads[who],
          messages: [...next.threads[who].messages, { system: true, text: '(응답하지 않음 — 대화가 닫혔습니다)' }],
          pending: { ...p, penalized: true },
        },
      },
      unread: { ...next.unread, chat: { ...next.unread.chat, [who]: 0 } },
    };
  }
  return next;
}

/** MAIL 읽음 처리 */
export function markMailRead(state, mailId) {
  let dropped = 0;
  const inbox = state.inbox.map((m) => {
    if (m.id === mailId && !m.read) { dropped = 1; return { ...m, read: true }; }
    return m;
  });
  return { ...state, inbox, unread: { ...state.unread, mail: Math.max(0, state.unread.mail - dropped) } };
}

/** NEWS 기사 읽음 처리 (배지 제거) */
export function markNewsRead(state, newsId) {
  let dropped = 0;
  const news = state.news.map((n) => {
    if (n.id === newsId && !n.read) { dropped = 1; return { ...n, read: true }; }
    return n;
  });
  return { ...state, news, unread: { ...state.unread, news: Math.max(0, (state.unread.news ?? 0) - dropped) } };
}

/** CHAT 스레드 읽음 처리 (배지 제거) */
export function markThreadRead(state, who) {
  const thread = state.threads[who];
  if (!thread) return state;
  return {
    ...state,
    threads: { ...state.threads, [who]: { ...thread, read: true } },
    unread: { ...state.unread, chat: { ...state.unread.chat, [who]: 0 } },
  };
}

/** 채팅 응답 완료 → pending 해제 (관계 유지) */
export function resolveChatPending(state, who) {
  const thread = state.threads[who];
  if (!thread) return state;
  return { ...state, threads: { ...state.threads, [who]: { ...thread, pending: null } } };
}

/**
 * 인라인 채팅 선택 처리. 내 말풍선 추가 + 효과 적용 + 다음 흐름 결정.
 * @returns {{ state, jumpTo }} jumpTo: story로 넘어가야 하면 그 이벤트 id
 */
export function applyInlineChoice(state, who, eventId, choiceIndex, eventMap) {
  const evt = eventMap.get(eventId);
  const choiceStep = (evt?.messages ?? []).find((m) => m.choices);
  const choice = choiceStep?.choices?.[choiceIndex];
  if (!choice) return { state, jumpTo: null };

  let next = pushMessage(state, who, { from: 'PLAYER', text: choice.text });
  next = applyEffects(next, choice.effects);
  next = resolveChatPending(next, who);

  if (!choice.next) return { state: next, jumpTo: null };
  const target = eventMap.get(choice.next);
  if (!target) { console.warn(`[inbox] 인라인 next 없음: ${choice.next}`); return { state: next, jumpTo: null }; }

  if (target.kind === 'chat') {
    next = deliverChat(next, target);
    next = markThreadRead(next, who);
    return { state: next, jumpTo: null };
  }
  return { state: next, jumpTo: choice.next };
}

function pushMessage(state, who, msg) {
  const thread = state.threads[who] ?? { messages: [], read: true, pending: null };
  return {
    ...state,
    threads: { ...state.threads, [who]: { ...thread, messages: [...thread.messages, msg] } },
  };
}

/** 총 안 읽음 개수 (탭 배지용) */
export function totalUnread(state) {
  const chat = Object.values(state.unread.chat ?? {}).reduce((a, b) => a + b, 0);
  return { mail: state.unread.mail ?? 0, chat };
}
