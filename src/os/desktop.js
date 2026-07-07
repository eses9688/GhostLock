// desktop.js — GhostOS 데스크톱 (상단바 + 아이콘 그리드 + 태스크바)

import { APPS, isUnlocked } from './apps.js';
import { formatTime } from '../engine/time.js';

let el = {};
let handlers = {};

export function initDesktop(elements, cbs) {
  el = elements;          // { topbar, desktop, taskbar }
  handlers = cbs;         // { onOpenApp }
}

// 전체 데스크톱 갱신
export function renderDesktop(state) {
  renderTopbar(state);
  renderIcons(state);
  renderTaskbar(state);
}

function renderTopbar(state) {
  el.topbar.innerHTML = `
    <span class="os-brand">GhostOS</span>
    <span class="os-clock">${formatTime(state.time)}</span>
  `;
}

function renderIcons(state) {
  el.desktop.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'os-icons';

  for (const app of APPS) {
    const unlocked = isUnlocked(app, state);
    const btn = document.createElement('button');
    btn.className = 'os-icon' + (unlocked ? '' : ' is-locked');
    btn.disabled = !unlocked;

    const badge = unlocked && app.badge ? app.badge(state) : 0;
    btn.innerHTML = `
      <span class="icon-glyph">${unlocked ? app.glyph : '🔒'}</span>
      <span class="icon-name">${escapeHtml(app.name)}</span>
      ${badge > 0 ? `<span class="icon-badge">${badge}</span>` : ''}
    `;
    if (unlocked) btn.addEventListener('click', () => handlers.onOpenApp(app.id));
    grid.appendChild(btn);
  }
  el.desktop.appendChild(grid);
}

function renderTaskbar(state) {
  const unlockedCount = APPS.filter((a) => isUnlocked(a, state)).length;
  el.taskbar.innerHTML = `
    <span class="task-status">● connected</span>
    <span class="task-hint">아이콘을 눌러 프로그램을 실행하세요</span>
    <span class="task-apps">${unlockedCount} apps</span>
  `;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
