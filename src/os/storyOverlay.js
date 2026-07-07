// storyOverlay.js — Story 시스템 이벤트 오버레이 (앱이 아님)
//
// Story는 프로그램이 아니라 GhostOS가 직접 출력하는 시스템 이벤트다.
// 필요한 순간 화면 전체를 장악하여 서사/선택을 전달하고, 끝나면 데스크톱으로 복귀한다.

import { typeText } from '../ui/terminal.js';
import { isChoiceAvailable } from '../engine/event.js';

let overlayEl = null;

export function initStoryOverlay(el) {
  overlayEl = el;
}

export function isStoryOpen() {
  return overlayEl && !overlayEl.hidden;
}

/**
 * 스토리 이벤트를 전체화면으로 출력.
 * @param {object} ctx - { event, state, onChoice(idx), onDismiss() }
 */
export function showStory(ctx) {
  const { event, state } = ctx;
  overlayEl.hidden = false;
  overlayEl.className = 'story-open';
  overlayEl.innerHTML = `
    <div class="story-frame">
      <div class="story-sys">◈ SYSTEM</div>
      ${event.title ? `<h1 class="story-title">${escapeHtml(event.title)}</h1>` : ''}
      <div class="story-text"></div>
      <div class="story-choices"></div>
    </div>
  `;
  const textEl = overlayEl.querySelector('.story-text');
  const choicesEl = overlayEl.querySelector('.story-choices');

  const typer = typeText(textEl, event.text ?? '', {
    speed: 16,
    onDone: () => renderChoices(choicesEl, event, state, ctx),
  });
  // 클릭하면 타이핑 스킵
  overlayEl.querySelector('.story-frame').onclick = (e) => {
    if (e.target.closest('.story-choices')) return;
    typer.skip();
  };
}

function renderChoices(choicesEl, event, state, ctx) {
  choicesEl.innerHTML = '';

  if (event.ending || !event.choices?.length) {
    const btn = document.createElement('button');
    btn.className = 'story-choice story-continue';
    btn.innerHTML = `<span class="sc-cursor">▸</span> 데스크톱으로 돌아가기`;
    btn.addEventListener('click', () => ctx.onDismiss());
    choicesEl.appendChild(btn);
    requestAnimationFrame(() => choicesEl.classList.add('sc-in'));
    return;
  }

  event.choices.forEach((choice, i) => {
    const available = isChoiceAvailable(choice, state);
    const btn = document.createElement('button');
    btn.className = 'story-choice' + (available ? '' : ' is-locked');
    btn.disabled = !available;
    btn.innerHTML = `<span class="sc-cursor">▸</span> ${escapeHtml(choice.text)}`
      + (available ? '' : ' <span class="sc-lock">[locked]</span>');
    if (available) btn.addEventListener('click', () => ctx.onChoice(i));
    choicesEl.appendChild(btn);
  });
  requestAnimationFrame(() => choicesEl.classList.add('sc-in'));
}

export function hideStory() {
  if (!overlayEl) return;
  overlayEl.className = 'story-out';
  setTimeout(() => {
    overlayEl.hidden = true;
    overlayEl.innerHTML = '';
    overlayEl.className = '';
  }, 400);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = (str ?? '').toString();
  return d.innerHTML.replace(/\n/g, '<br>');
}
