// monitor.js — Monitor 앱 (의뢰 진행 현황)
//
// 현재/최근 의뢰의 카테고리·진행·보상을 보여준다.
// 지금은 rank/history 기반의 요약. 스토리가 늘면 정보량도 늘릴 수 있다.

export function renderMonitor(ctx) {
  const { state } = ctx;
  const root = ctx.root;

  const rankLabels = ['UNKNOWN', 'RUNNER', 'OPERATOR', 'HANDLER', 'GHOST'];
  const rank = rankLabels[Math.min(state.rank ?? 0, rankLabels.length - 1)];
  const jobsDone = (state.history ?? []).filter((id) => id.startsWith('EVT_') && id.includes('JOB')).length;
  const lastReward = (state.ledger ?? []).find((e) => e.amount > 0)?.amount ?? 0;

  root.innerHTML = `
    <div class="monitor">
      <div class="mon-card">
        <span class="mon-label">현재 등급</span>
        <span class="mon-value">${rank}</span>
      </div>
      <div class="mon-grid">
        <div class="mon-item"><span>완료 의뢰</span><b>${jobsDone}</b></div>
        <div class="mon-item"><span>최근 보상</span><b>₩${lastReward}</b></div>
        <div class="mon-item"><span>경과일</span><b>DAY ${state.time?.day ?? 1}</b></div>
        <div class="mon-item"><span>누적 스트레스</span><b>${state.stress ?? 0}</b></div>
      </div>
      <div class="mon-note">진행 중인 의뢰가 없습니다. 새 의뢰는 MAIL로 도착합니다.</div>
    </div>
  `;
}
