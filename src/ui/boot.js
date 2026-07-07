// boot.js — 시스템 부팅 연출 (명세서 5.3 bootSequence, 7.2)
//
// 게임 시작 시 GhostLock OS가 부팅되는 연출.
// 세계관 진입의 첫 인상 — 여기서 톤이 결정된다.

import { typeLines } from './terminal.js';

const BOOT_LINES = [
  'ghostlock kernel 0.9.7 (unsigned build)',
  'initializing secure shell ....... ok',
  'mounting /dev/ghost .............. ok',
  'purging trace logs .............. ok',
  'verifying operator identity ..... UNKNOWN',
  '',
  '  no name. no record. good.',
  '',
  'establishing channel ............ connected',
];

/**
 * 부팅 시퀀스를 재생하고 완료되면 resolve.
 * @param {HTMLElement} mountEl - 부팅 화면을 그릴 컨테이너
 * @returns {Promise<void>}
 */
export async function bootSequence(mountEl) {
  mountEl.innerHTML = '';
  mountEl.classList.add('boot-screen');

  const logEl = document.createElement('pre');
  logEl.className = 'boot-log';
  mountEl.appendChild(logEl);

  await typeLines(logEl, BOOT_LINES, { speed: 12 });

  // 마지막 깜빡임 후 진입
  await wait(500);

  const enterEl = document.createElement('div');
  enterEl.className = 'boot-enter';
  enterEl.innerHTML = '<span class="blink">▮</span> press any key to connect';
  mountEl.appendChild(enterEl);

  await waitForInput();
  mountEl.classList.remove('boot-screen');
  mountEl.classList.add('boot-out');
  await wait(400);
}

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function waitForInput() {
  return new Promise((res) => {
    const handler = () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
      res();
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('click', handler);
  });
}
