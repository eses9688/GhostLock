// render.js — 렌더러 (명세서 2.3 UI 구조, 4)
//
// state와 현재 이벤트를 받아 화면을 그린다. 로직은 없다 — 순수 표시.
// 콜백(onChoice, onPanel)을 통해 사용자 입력을 바깥(main.js)으로 전달.

import { formatTime } from '../engine/time.js';
import { isChoiceAvailable } from '../engine/event.js';
import { typeText } from './terminal.js';
import { renderPanelBar, PANELS } from './panel.js';

// 상단 STATUS 바 (TIME / Money / Stress / Rank)
export function renderStatusBar(el, state) {
  const rankLabels = ['UNKNOWN', 'RUNNER', 'OPERATOR', 'HANDLER', 'GHOST'];
  const rank = rankLabels[Math.min(state.rank, rankLabels.length - 1)];
  el.innerHTML = `
    <span class="stat stat-time">${formatTime(state.time)}</span>
    <span class="stat"><i>₩</i>${state.money}</span>
    <span class="stat stat-stress" data-level="${stressLevel(state.stress)}">
      <i>STRESS</i>${state.stress}
    </span>
    <span class="stat"><i>RANK</i>${rank}</span>
  `;
}

function stressLevel(s) {
  if (s >= 70) return 'high';
  if (s >= 40) return 'mid';
  return 'low';
}

/**
 * 메인 이벤트 화면을 렌더.
 * @param {object} ctx - { stageEl, choicesEl, state, event, onChoice }
 */
export function renderEvent(ctx) {
  const { stageEl, choicesEl, state, event, onChoice } = ctx;

  // 패널 컨텍스트에 따라 스테이지 스타일 전환
  const panel = PANELS[event.panel] ?? PANELS.event;
  stageEl.dataset.panel = panel.id;

  stageEl.innerHTML = `
    <div class="event-head">
      <span class="event-tag">${panel.glyph} ${panel.label}</span>
      ${event.title ? `<h2 class="event-title">${escapeHtml(event.title)}</h2>` : ''}
    </div>
    <div class="event-body"></div>
  `;
  const bodyEl = stageEl.querySelector('.event-body');
  choicesEl.innerHTML = '';

  // 본문 타이핑 → 완료 후 선택지 등장
  const typer = typeText(bodyEl, event.text, {
    speed: 14,
    onDone: () => renderChoices(choicesEl, state, event, onChoice),
  });

  // 타이핑 중 클릭하면 스킵
  stageEl.onclick = () => typer.skip();
}

function renderChoices(choicesEl, state, event, onChoice) {
  choicesEl.innerHTML = '';

  if (event.ending || !event.choices?.length) {
    const end = document.createElement('div');
    end.className = 'ending-mark';
    end.textContent = '— session paused —';
    choicesEl.appendChild(end);
    return;
  }

  event.choices.forEach((choice, i) => {
    const available = isChoiceAvailable(choice, state);
    const btn = document.createElement('button');
    btn.className = 'choice' + (available ? '' : ' is-locked');
    btn.disabled = !available;
    btn.innerHTML = `<span class="choice-cursor">▸</span> ${escapeHtml(choice.text)}` +
      (available ? '' : ' <span class="lock">[locked]</span>');
    if (available) btn.addEventListener('click', () => onChoice(i));
    choicesEl.appendChild(btn);
  });

  // 등장 애니메이션 트리거
  requestAnimationFrame(() => choicesEl.classList.add('choices-in'));
}

// 패널 바 렌더 위임
export function renderPanels(el, active, onSelect) {
  renderPanelBar(el, active, onSelect);
}

// LOG 패널 내용 (history)
export function renderLog(el, state, eventMap) {
  const items = state.history.map((id) => {
    const e = eventMap.get(id);
    return `<div class="log-line"><span class="log-id">${id}</span> ${escapeHtml(e?.title ?? '')}</div>`;
  });
  el.innerHTML = `<div class="log-wrap">${items.join('') || '<em>기록 없음</em>'}</div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.replace(/\n/g, '<br>');
}
