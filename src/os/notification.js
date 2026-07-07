// notification.js — GhostOS 데스크톱 알림
//
// 메일/채팅/뉴스 등이 도착하면 우측 하단에 알림 카드가 뜬다.
// 클릭하면 해당 앱이 열린다. 명세서의 Desktop Notification.

let mountEl = null;
let onClickApp = null;

export function initNotifications(el, { onOpenApp } = {}) {
  mountEl = el;
  onClickApp = onOpenApp;
}

/**
 * 알림 하나를 띄운다.
 * @param {object} n - { glyph, title, body, appId }
 */
export function notify(n) {
  if (!mountEl) return;
  const card = document.createElement('div');
  card.className = 'os-notif';
  card.innerHTML = `
    <span class="notif-glyph">${n.glyph ?? '●'}</span>
    <span class="notif-text">
      <span class="notif-title">${escapeHtml(n.title ?? '')}</span>
      <span class="notif-body">${escapeHtml(n.body ?? '')}</span>
    </span>
  `;
  if (n.appId) {
    card.classList.add('is-clickable');
    card.addEventListener('click', () => {
      onClickApp?.(n.appId);
      dismiss(card);
    });
  }
  mountEl.appendChild(card);
  requestAnimationFrame(() => card.classList.add('notif-in'));

  const hold = Math.min(6000, 3200 + (n.body?.length ?? 0) * 50);
  setTimeout(() => dismiss(card), hold);
}

function dismiss(card) {
  if (!card.isConnected) return;
  card.classList.remove('notif-in');
  card.classList.add('notif-out');
  setTimeout(() => card.remove(), 400);
}

// deliver된 이벤트를 알림으로 변환 (kind별 문구)
export function notifyForEvent(evt, characters) {
  if (!evt) return;
  if (evt.kind === 'mail') {
    const sender = characters[evt.sender]?.name ?? evt.sender ?? '';
    notify({ glyph: '✉', title: `New Mail · ${sender}`, body: evt.subject ?? '', appId: 'mail' });
  } else if (evt.kind === 'chat') {
    const sender = characters[evt.sender]?.name ?? evt.sender ?? '';
    const first = (evt.messages ?? []).find((m) => m.text)?.text ?? '';
    notify({ glyph: '💬', title: sender, body: first, appId: 'messenger' });
  } else if (evt.kind === 'news') {
    notify({ glyph: '📰', title: '새 기사 등록', body: evt.headline ?? '', appId: 'news' });
  }
}

// 프로그램 해금(설치) 알림
export function notifyAppInstalled(appId, appName) {
  notify({
    glyph: '⊞',
    title: '새 프로그램 설치됨',
    body: appName ?? appId,
    appId,
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
