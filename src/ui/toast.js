// toast.js — 하단 자동소멸 알림 (수치 비노출, 세계의 시선만 전달)
//
// 엔진이 state.toasts 큐에 쌓아둔 문구를 화면 하단에 띄웠다가 스스로 사라지게 한다.
// 팝업이 아니라 카톡 알림처럼 가볍게. tone: good / bad / dim / neutral

let containerEl = null;

function ensureContainer() {
  if (containerEl) return containerEl;
  containerEl = document.createElement('div');
  containerEl.id = 'toast-layer';
  containerEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(containerEl);
  return containerEl;
}

/** 토스트 하나를 띄운다. */
export function showToast(text, tone = 'neutral') {
  const layer = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${tone}`;
  el.textContent = text;
  layer.appendChild(el);

  requestAnimationFrame(() => el.classList.add('toast-in'));

  const hold = Math.min(5200, 2600 + text.length * 55);
  setTimeout(() => {
    el.classList.remove('toast-in');
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 450);
  }, hold);
}

/**
 * state.toasts 큐를 순차적으로 비우며 화면에 표시.
 * 표시 후 큐를 비운 새 state를 반환한다 (엔진과 UI의 경계).
 */
export function flushToasts(state) {
  const queue = state.toasts ?? [];
  queue.forEach((t, i) => {
    setTimeout(() => showToast(t.text, t.tone), i * 700);
  });
  return { ...state, toasts: [] };
}