// apps.js — GhostOS 앱 레지스트리
//
// 각 프로그램을 데이터로 정의한다. 데스크톱은 여기서 "해금된 앱"만 아이콘으로 그린다.
// 챕터가 진행되며 unlock 조건이 충족되면 아이콘이 늘어난다 (= 서사 연출).
//
// 렌더러(render)는 (windowBodyEl, ctx) => void 형태로, 창의 body에 내용을 그린다.
// ctx = { state, eventMap, characters, actions } — actions는 main이 주입하는 콜백 모음.

import { renderMail } from '../ui/mail.js';
import { renderChat } from '../ui/chat.js';

// 해금 조건 평가: unlock이 없으면 항상 해금. 함수면 state로 판정.
export function isUnlocked(app, state) {
  if (!app.unlock) return true;
  try { return app.unlock(state); } catch { return false; }
}

export const APPS = [
  {
    id: 'mail',
    name: 'Mail',
    glyph: '✉',
    // 1단계: 처음부터 해금
    unlock: null,
    render(bodyEl, ctx) {
      renderMail({
        root: bodyEl,
        state: ctx.state,
        eventMap: ctx.eventMap,
        characters: ctx.characters,
        selectedId: ctx.appState?.selectedId,
        onRead: (id) => ctx.actions.mailRead(id),
        onAction: (nextId) => ctx.actions.storyJump(nextId),
      });
    },
    // 배지: 안 읽은 메일 수
    badge: (state) => state.unread?.mail ?? 0,
  },
  {
    id: 'messenger',
    name: 'Messenger',
    glyph: '💬',
    unlock: null,
    render(bodyEl, ctx) {
      renderChat({
        root: bodyEl,
        state: ctx.state,
        eventMap: ctx.eventMap,
        characters: ctx.characters,
        selectedWho: ctx.appState?.selectedWho,
        onOpenThread: (who) => ctx.actions.chatOpen(who),
        onInlineChoice: (who, eventId, idx) => ctx.actions.chatChoice(who, eventId, idx),
        onJump: (nextId) => ctx.actions.storyJump(nextId),
      });
    },
    badge: (state) => Object.values(state.unread?.chat ?? {}).reduce((a, b) => a + b, 0),
  },

  // ── 아래는 2~3단계에서 구현. 지금은 잠금 아이콘으로만 노출(연출용). ──
  { id: 'monitor', name: 'Monitor', glyph: '📊', unlock: () => false, locked: true },
  { id: 'wallet',  name: 'Wallet',  glyph: '💰', unlock: () => false, locked: true },
  { id: 'news',    name: 'News',    glyph: '📰', unlock: () => false, locked: true },
  { id: 'files',   name: 'Files',   glyph: '📁', unlock: () => false, locked: true },
  { id: 'notes',   name: 'Notes',   glyph: '📝', unlock: () => false, locked: true },
  { id: 'console', name: 'Console', glyph: '💻', unlock: () => false, locked: true },
];

export function getApp(id) {
  return APPS.find((a) => a.id === id) ?? null;
}
