// notes.js — Notes 앱 (획득 정보 자동 기록)
//
// 만난 인물, 완료한 의뢰 등을 자동으로 정리해서 보여준다.
// 별도 데이터 없이 state(threads/history/ledger)에서 유추한다.

export function renderNotes(ctx) {
  const { state, characters } = ctx;
  const root = ctx.root;

  const blocks = [];

  // 만난 인물 (대화 스레드가 있는 사람)
  const people = Object.keys(state.threads ?? {});
  if (people.length) {
    const items = people.map((who) => {
      const p = characters[who] ?? { name: who };
      return `<div class="note-line"><b style="color:${p.color ?? 'var(--ink)'}">${esc(p.name)}</b>
        <span class="note-sub">${esc(p.role ?? '조직 관련 인물')}</span></div>`;
    }).join('');
    blocks.push(`<div class="note-block"><div class="note-h">인물</div>${items}</div>`);
  }

  // 완료 의뢰 / 자금
  const income = (state.ledger ?? []).filter((e) => e.amount > 0);
  if (income.length) {
    const items = income.slice(0, 8).map((e) =>
      `<div class="note-line">D${e.at?.day ?? 1} · ${esc(e.reason || '의뢰 보수')} <span class="note-sub">₩${e.amount}</span></div>`
    ).join('');
    blocks.push(`<div class="note-block"><div class="note-h">의뢰 기록</div>${items}</div>`);
  }

  // 커스텀 노트 (스토리가 명시적으로 남긴 것)
  for (const n of state.notes ?? []) {
    blocks.push(`<div class="note-block"><div class="note-h">${esc(n.title)}</div><div class="note-line">${esc(n.body).replace(/\n/g, '<br>')}</div></div>`);
  }

  root.innerHTML = blocks.length
    ? `<div class="notes">${blocks.join('')}</div>`
    : `<div class="notes-empty">아직 기록된 정보가 없습니다.</div>`;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
