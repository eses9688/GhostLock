// news.js — News 앱 (IT 뉴스)
//
// 좌측 기사 목록 / 우측 본문. 기사 내용은 events.json의 news 이벤트에서 온다.
// (규칙: 기사에서 플레이어가 조사한 기업명은 직접 언급하지 않는다 — 데이터에서 관리)

import { markNewsRead } from '../engine/inbox.js';
import { absHour } from '../engine/state.js';

export function renderNews(ctx) {
  const { root, state, eventMap } = ctx;

  if (!state.news || state.news.length === 0) {
    root.innerHTML = `<div class="news-empty">등록된 기사가 없습니다.</div>`;
    return;
  }

  const selectedId = ctx.appState?.newsSelected ?? state.news[0].id;

  root.innerHTML = `<div class="news-layout"><ul class="news-list"></ul><div class="news-reader"></div></div>`;
  const listEl = root.querySelector('.news-list');
  const readerEl = root.querySelector('.news-reader');

  for (const item of state.news) {
    const evt = eventMap.get(item.id);
    if (!evt) continue;
    const li = document.createElement('li');
    li.className = 'news-row' + (item.id === selectedId ? ' is-selected' : '') + (item.read ? '' : ' is-unread');
    li.innerHTML = `
      <span class="news-tag">${esc(evt.section ?? 'IT NEWS')}</span>
      <span class="news-headline">${esc(evt.headline ?? '')}</span>
      ${item.read ? '' : '<span class="news-dot">●</span>'}`;
    li.addEventListener('click', () => {
      if (ctx.actions?.newsRead) ctx.actions.newsRead(item.id);
      renderNews({ ...ctx, appState: { ...ctx.appState, newsSelected: item.id }, state: markNewsRead(state, item.id) });
    });
    listEl.appendChild(li);
  }

  const sel = eventMap.get(selectedId);
  if (sel) {
    // 사건 발생 시점 → 지금까지 며칠 지났는지 계산해 "지난 X일" 표현 자동 생성
    const meta = state.news.find((n) => n.id === selectedId);
    const lede = relativeLede(meta?.occurredAt, state.time);

    readerEl.innerHTML = `
      <div class="news-head">
        <span class="news-section">${esc(sel.section ?? 'IT NEWS')}</span>
        <h2 class="news-title">${esc(sel.headline ?? '')}</h2>
      </div>
      <div class="news-body">${lede}${esc(sel.body ?? '').replace(/\n/g, '<br>')}</div>`;
  }
}

// 사건 발생 후 경과에 따라 기사 첫머리 문구를 만든다.
function relativeLede(occurredAt, nowTime) {
  if (occurredAt == null) return '';
  const days = Math.floor((absHour(nowTime) - occurredAt) / 24);
  let phrase;
  if (days <= 0) phrase = '오늘';
  else if (days === 1) phrase = '어제';
  else phrase = `${days}일 전`;
  return `<span class="news-lede">${phrase},</span> `;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
