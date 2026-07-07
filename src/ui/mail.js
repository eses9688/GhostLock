// mail.js — MAIL 아카이브 렌더러 (일/스토리 공식 채널, 시간 정지)
//
// 왼쪽 리스트 / 오른쪽 본문. action 있으면 스토리 점프 버튼.
// 이미 수행한 의뢰는 버튼 대신 "완료" 표시.

import { markMailRead } from '../engine/inbox.js';

export function renderMail(ctx) {
  const { root, state, eventMap, characters } = ctx;
  root.dataset.panel = 'mail';

  if (state.inbox.length === 0) {
    root.innerHTML = `<div class="mail-empty">받은 메일이 없습니다.</div>`;
    return;
  }

  const selectedId = ctx.selectedId ?? state.inbox[0].id;
  root.innerHTML = `<div class="mail-layout"><ul class="mail-list"></ul><div class="mail-reader"></div></div>`;
  const listEl = root.querySelector('.mail-list');
  const readerEl = root.querySelector('.mail-reader');

  for (const item of state.inbox) {
    const evt = eventMap.get(item.id);
    if (!evt) continue;
    const sender = characters[evt.sender] ?? { name: evt.sender ?? '?' };
    const li = document.createElement('li');
    li.className = 'mail-row' + (item.id === selectedId ? ' is-selected' : '') + (item.read ? '' : ' is-unread');
    li.innerHTML = `
      <span class="mail-sender">${esc(sender.name)}</span>
      <span class="mail-subject">${esc(evt.subject ?? '(제목 없음)')}</span>
      <span class="mail-day">D${Math.floor(item.arrivedAt / 24)}</span>
      ${item.read ? '' : '<span class="mail-dot">●</span>'}`;
    li.addEventListener('click', () => {
      ctx.onRead?.(item.id);
      renderMail({ ...ctx, selectedId: item.id, state: markMailRead(state, item.id) });
    });
    listEl.appendChild(li);
  }

  const sel = eventMap.get(selectedId);
  if (sel) {
    const sender = characters[sel.sender] ?? { name: sel.sender ?? '?' };
    readerEl.innerHTML = `
      <div class="mail-head">
        <div class="mail-from">발신: <b>${esc(sender.name)}</b>${sender.role ? `<span class="mail-role">${esc(sender.role)}</span>` : ''}</div>
        <h2 class="mail-title">${esc(sel.subject ?? '')}</h2>
      </div>
      <div class="mail-body">${esc(sel.body ?? '').replace(/\n/g, '<br>')}</div>
      <div class="mail-action"></div>`;
    const actionEl = readerEl.querySelector('.mail-action');
    if (sel.action) {
      // 이 의뢰가 이미 수행됐는지: action이 가리키는 이벤트를 방문한 적 있으면 완료로 간주
      const done = (state.history ?? []).includes(sel.action.next);
      if (done) {
        const mark = document.createElement('div');
        mark.className = 'mail-done';
        mark.textContent = '✓ 완료된 의뢰';
        actionEl.appendChild(mark);
      } else {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.innerHTML = `<span class="choice-cursor">▸</span> ${esc(sel.action.text)}`;
        btn.addEventListener('click', () => ctx.onAction?.(sel.action.next));
        actionEl.appendChild(btn);
      }
    }
  }
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}