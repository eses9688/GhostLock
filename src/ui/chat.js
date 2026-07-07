// chat.js — CHAT 메신저 렌더러 (인간 관계 채널, 유효기간)
//
// 왼쪽 연락처 / 오른쪽 말풍선. inline이면 채팅 안에서 선택, jump면 SYSTEM으로.

import { markThreadRead } from '../engine/inbox.js';
import { absHour } from '../engine/state.js';

export function renderChat(ctx) {
  const { root, state, characters } = ctx;
  root.dataset.panel = 'chat';

  const contacts = Object.keys(state.threads);
  if (contacts.length === 0) {
    root.innerHTML = `<div class="chat-empty">아직 아무에게서도 연락이 없습니다.</div>`;
    return;
  }

  const selectedWho = ctx.selectedWho ?? contacts[0];
  root.innerHTML = `<div class="chat-layout"><ul class="chat-contacts"></ul><div class="chat-thread"></div></div>`;
  const contactsEl = root.querySelector('.chat-contacts');
  const threadEl = root.querySelector('.chat-thread');

  for (const who of contacts) {
    const thread = state.threads[who];
    const person = characters[who] ?? { name: who, color: '#888' };
    const unread = state.unread.chat?.[who] ?? 0;
    const li = document.createElement('li');
    li.className = 'chat-contact' + (who === selectedWho ? ' is-selected' : '');
    li.innerHTML = `
      <span class="chat-avatar" style="--who:${person.color}">${initial(person.name)}</span>
      <span class="chat-meta"><span class="chat-name">${esc(person.name)}</span><span class="chat-last">${esc(lastPreview(thread))}</span></span>
      ${unread ? `<span class="chat-badge">${unread}</span>` : ''}`;
    li.addEventListener('click', () => {
      ctx.onOpenThread?.(who);
      renderChat({ ...ctx, selectedWho: who, state: markThreadRead(state, who) });
    });
    contactsEl.appendChild(li);
  }

  renderThread(threadEl, selectedWho, ctx);
}

function renderThread(threadEl, who, ctx) {
  const { state, eventMap, characters } = ctx;
  const thread = state.threads[who];
  const person = characters[who] ?? { name: who, color: '#888' };

  threadEl.innerHTML = `
    <div class="thread-head">
      <span class="chat-avatar sm" style="--who:${person.color}">${initial(person.name)}</span>
      <span><b>${esc(person.name)}</b>${person.role ? `<span class="thread-role">${esc(person.role)}</span>` : ''}</span>
    </div>
    <div class="thread-body"></div>
    <div class="thread-input"></div>`;
  const bodyEl = threadEl.querySelector('.thread-body');
  const inputEl = threadEl.querySelector('.thread-input');

  for (const msg of thread.messages) bodyEl.appendChild(renderBubble(msg));

  const p = thread.pending;
  if (p && !p.penalized) {
    const evt = eventMap.get(p.eventId);
    if (evt?.jump) {
      const jumpBtn = document.createElement('button');
      jumpBtn.className = 'choice chat-jump';
      jumpBtn.innerHTML = `<span class="choice-cursor">▸</span> SYSTEM에서 계속`;
      jumpBtn.addEventListener('click', () => ctx.onJump?.(evt.jump, who));
      inputEl.appendChild(jumpBtn);
      showDeadline(inputEl, p, state);
    } else {
      const choiceStep = (evt?.messages ?? []).find((m) => m.choices);
      if (choiceStep) {
        choiceStep.choices.forEach((c, i) => {
          const btn = document.createElement('button');
          btn.className = 'choice chat-reply';
          btn.textContent = c.text;
          btn.addEventListener('click', () => ctx.onInlineChoice?.(who, p.eventId, i));
          inputEl.appendChild(btn);
        });
        showDeadline(inputEl, p, state);
      }
    }
  }
  requestAnimationFrame(() => { bodyEl.scrollTop = bodyEl.scrollHeight; });
}

function showDeadline(inputEl, pending, state) {
  const remain = pending.deadline - absHour(state.time);
  if (remain > 12) return;
  const note = document.createElement('div');
  note.className = 'chat-deadline' + (remain <= 3 ? ' urgent' : '');
  note.textContent = remain <= 0 ? '답장이 늦었다...' : `답장을 기다리는 중 · 약 ${remain}시간`;
  inputEl.appendChild(note);
}

function renderBubble(msg) {
  const el = document.createElement('div');
  if (msg.system) { el.className = 'bubble-system'; el.textContent = msg.text; return el; }
  const mine = msg.from === 'PLAYER';
  el.className = 'bubble ' + (mine ? 'bubble-me' : 'bubble-them');
  el.textContent = msg.text;
  return el;
}

function lastPreview(thread) {
  const msgs = thread.messages.filter((m) => !m.system);
  const last = msgs[msgs.length - 1];
  if (!last) return '';
  const t = last.text ?? '';
  return t.length > 22 ? t.slice(0, 22) + '…' : t;
}

function initial(name) { return (name ?? '?').trim().charAt(0).toUpperCase(); }
function esc(str) { const d = document.createElement('div'); d.textContent = str ?? ''; return d.innerHTML; }