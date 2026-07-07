// windowManager.js — GhostOS 창 관리 (한 번에 하나, 고정 위치)
//
// 명세서: 큰 창 하나, 드래그 없음. 아이콘을 누르면 그 앱의 창이 중앙에 크게 열리고,
// 닫으면 데스크톱으로 돌아간다. 다른 앱을 열면 기존 창은 교체된다.

let mountEl = null;
let current = null;   // 현재 열린 app id
let onCloseCb = null; // 창이 닫힐 때 호출 (데스크톱 갱신용)

export function initWindows(el, { onClose } = {}) {
  mountEl = el;
  onCloseCb = onClose;
}

export function getOpenApp() {
  return current;
}

/**
 * 앱 창을 연다 (기존 창은 교체).
 * @param {object} app - APPS의 항목
 * @param {object} ctx - 렌더 컨텍스트
 */
export function openWindow(app, ctx) {
  current = app.id;
  mountEl.innerHTML = '';

  const win = document.createElement('div');
  win.className = 'os-window';
  win.dataset.app = app.id;
  win.innerHTML = `
    <div class="win-titlebar">
      <span class="win-title"><span class="win-glyph">${app.glyph}</span> ${escapeHtml(app.name)}</span>
      <button class="win-close" aria-label="닫기">✕</button>
    </div>
    <div class="win-body"></div>
  `;
  mountEl.appendChild(win);
  mountEl.hidden = false;

  const bodyEl = win.querySelector('.win-body');
  app.render(bodyEl, ctx);

  win.querySelector('.win-close').addEventListener('click', closeWindow);

  // 등장 애니메이션
  requestAnimationFrame(() => win.classList.add('win-in'));
}

// 현재 열린 창의 body만 다시 그린다 (상태 변경 후 갱신용, 창 재생성 X)
export function refreshWindow(app, ctx) {
  const bodyEl = mountEl.querySelector('.os-window .win-body');
  if (!bodyEl || current !== app.id) return;
  app.render(bodyEl, ctx);
}

export function closeWindow() {
  current = null;
  mountEl.innerHTML = '';
  mountEl.hidden = true;
  onCloseCb?.();
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
