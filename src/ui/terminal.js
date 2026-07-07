// terminal.js — 타이핑 애니메이션 (명세서 4.3, 7.2)
//
// 텍스트를 한 글자씩 출력하는 타이핑 효과. 몰입의 핵심 장치.
// reduced-motion 사용자는 즉시 표시 (접근성).

const prefersReducedMotion =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * 요소에 텍스트를 타이핑 효과로 출력.
 * @param {HTMLElement} el - 대상 요소
 * @param {string} text - 출력할 텍스트
 * @param {object} opts - { speed: 글자당 ms, onDone }
 * @returns {{ skip: () => void }} 진행 중 스킵 핸들
 */
export function typeText(el, text, opts = {}) {
  const { speed = 18, onDone } = opts;
  el.textContent = '';
  el.classList.add('is-typing');

  // 모션 최소화 설정이면 즉시 표시
  if (prefersReducedMotion || speed === 0) {
    el.textContent = text;
    el.classList.remove('is-typing');
    onDone?.();
    return { skip() {} };
  }

  let i = 0;
  let timer = null;
  let done = false;

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    el.textContent = text;
    el.classList.remove('is-typing');
    onDone?.();
  }

  function step() {
    if (i >= text.length) return finish();
    el.textContent = text.slice(0, i + 1);
    i++;
    // 줄바꿈/문장부호에서 살짝 멈춤 — 사람이 치는 리듬
    const ch = text[i - 1];
    const delay = ch === '\n' ? speed * 8 : /[.!?]/.test(ch) ? speed * 6 : speed;
    timer = setTimeout(step, delay);
  }

  step();
  return { skip: finish };
}

// 여러 줄을 순차 타이핑 (부팅 로그용)
export async function typeLines(el, lines, opts = {}) {
  for (const line of lines) {
    const lineEl = document.createElement('div');
    el.appendChild(lineEl);
    await new Promise((res) => typeText(lineEl, line, { ...opts, onDone: res }));
  }
}
