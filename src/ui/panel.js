// panel.js — 패널 시스템 (명세서 4.2)
//
// Ghost OS의 채널들. 이벤트의 panel 필드에 따라 활성 채널이 바뀐다.
// 각 패널은 시각적 컨텍스트(어떤 창에서 벌어지는 일인가)를 준다.

export const PANELS = {
  event:    { id: 'event',    label: 'SYSTEM',   glyph: '◈' },
  mail:     { id: 'mail',     label: 'MAIL',     glyph: '✉' },
  chat:     { id: 'chat',     label: 'CHAT',     glyph: '❯_' },
  terminal: { id: 'terminal', label: 'SHELL',    glyph: '>_' },
  intel:    { id: 'intel',    label: 'INTEL',    glyph: '◉' },
  log:      { id: 'log',      label: 'LOG',      glyph: '≡' },
};

export const PANEL_ORDER = ['event', 'mail', 'chat', 'terminal', 'intel', 'log'];

// 패널 탭 바를 렌더. activePanel을 하이라이트.
export function renderPanelBar(container, activePanel, onSelect) {
  container.innerHTML = '';
  for (const id of PANEL_ORDER) {
    const p = PANELS[id];
    const tab = document.createElement('button');
    tab.className = 'panel-tab' + (id === activePanel ? ' is-active' : '');
    tab.innerHTML = `<span class="tab-glyph">${p.glyph}</span> ${p.label}`;
    tab.setAttribute('aria-pressed', id === activePanel);
    tab.addEventListener('click', () => onSelect(id));
    container.appendChild(tab);
  }
}
