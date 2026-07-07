// main.js — 진입점. GhostOS를 부팅한다.

import { boot, devTools } from './os/ghostos.js';

window.addEventListener('DOMContentLoaded', boot);

// 개발 편의: 콘솔에서 GHOSTLOCK.state() / .open('mail') / .reset() 등
window.GHOSTLOCK = devTools();
