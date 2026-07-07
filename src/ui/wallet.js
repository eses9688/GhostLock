// wallet.js — Wallet 앱 (자금 현황)
//
// 현재 잔액 / 최근 입금 / 누적 보상. money 상태와 ledger에서 읽는다.

export function renderWallet(ctx) {
  const { root, state } = ctx;
  const ledger = state.ledger ?? [];
  const income = ledger.filter((e) => e.amount > 0);
  const totalReward = income.reduce((sum, e) => sum + e.amount, 0);

  const rows = ledger.length
    ? ledger.slice(0, 12).map((e) => {
        const sign = e.amount >= 0 ? '+' : '';
        const cls = e.amount >= 0 ? 'ledger-in' : 'ledger-out';
        const day = e.at?.day ?? 1;
        return `<div class="ledger-row">
          <span class="ledger-day">D${day}</span>
          <span class="ledger-reason">${esc(e.reason || (e.amount >= 0 ? '입금' : '지출'))}</span>
          <span class="ledger-amt ${cls}">${sign}₩${Math.abs(e.amount)}</span>
        </div>`;
      }).join('')
    : '<div class="wallet-empty">거래 내역이 없습니다.</div>';

  root.innerHTML = `
    <div class="wallet">
      <div class="wallet-balance">
        <span class="wallet-label">현재 잔액</span>
        <span class="wallet-amount">₩${state.money ?? 0}</span>
      </div>
      <div class="wallet-stats">
        <div class="wallet-stat"><span>누적 보상</span><b>₩${totalReward}</b></div>
        <div class="wallet-stat"><span>거래 건수</span><b>${ledger.length}</b></div>
      </div>
      <div class="wallet-ledger-title">최근 내역</div>
      <div class="wallet-ledger">${rows}</div>
    </div>
  `;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
