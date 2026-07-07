// ghostos.js — GhostOS 코어 (4계층 조율)
//
// Engine(상태) · GhostOS(화면/창) · Apps(프로그램) · StoryOverlay(연출)를 잇는다.
// 엔진은 순수 로직이라 그대로 쓰고, 여기서 데스크톱/창/오버레이/알림을 조립한다.

import { createState } from '../engine/state.js';
import { buildEventMap, enterEvent, chooseOption } from '../engine/event.js';
import {
  deliver, checkExpiries, checkScheduledNews, markMailRead, markNewsRead, markThreadRead, applyInlineChoice,
} from '../engine/inbox.js';
import { save, load } from '../engine/save.js';

import { bootSequence } from '../ui/boot.js';
import { flushToasts } from '../ui/toast.js';

import { APPS, getApp, isUnlocked } from './apps.js';
import { initDesktop, renderDesktop } from './desktop.js';
import { initWindows, openWindow, closeWindow, refreshWindow, getOpenApp } from './windowManager.js';
import { initStoryOverlay, showStory, hideStory, isStoryOpen } from './storyOverlay.js';
import { initNotifications, notifyForEvent } from './notification.js';

import eventsData from '../data/events.json';
import initialStateData from '../data/initialState.json';
import charactersData from '../data/characters.json';

const AUTOSAVE_SLOT = 'auto';

const os = {
  state: null,
  eventMap: null,
  characters: charactersData,
  appState: {},   // 앱별 UI 상태 (선택된 메일/스레드 등)
  el: {},
};

// 앱 렌더러에 넘길 액션 모음
const actions = {
  mailRead: (id) => { os.state = markMailRead(os.state, id); commit(); refreshOpenApp(); },
  newsRead: (id) => { os.state = markNewsRead(os.state, id); commit(); refreshOpenApp(); },
  chatOpen: (who) => { os.state = markThreadRead(os.state, who); os.appState.selectedWho = who; commit(); refreshOpenApp(); },
  chatChoice: (who, eventId, idx) => {
    const { state, jumpTo } = applyInlineChoice(os.state, who, eventId, idx, os.eventMap);
    os.state = state;
    os.appState.selectedWho = who;
    commit();
    if (jumpTo) { runStory(jumpTo); return; }
    refreshOpenApp();
  },
  storyJump: (nextId) => { closeWindow(); runStory(nextId); },
};

function buildCtx() {
  return {
    state: os.state,
    eventMap: os.eventMap,
    characters: os.characters,
    appState: os.appState,
    actions,
  };
}

// 상태 변경 후 공통 처리: 토스트 flush + 세이브 + 데스크톱 갱신
function commit() {
  os.state = flushToasts(os.state);
  save(AUTOSAVE_SLOT, os.state);
  renderDesktop(os.state);
}

// 현재 열린 창이 있으면 그 body만 다시 그림
function refreshOpenApp() {
  const openId = getOpenApp();
  if (!openId) return;
  const app = getApp(openId);
  if (app) refreshWindow(app, buildCtx());
}

// ── 앱 열기 ──
function openApp(appId) {
  const app = getApp(appId);
  if (!app || !isUnlocked(app, os.state)) return;
  // 앱 열기 전 스토리가 떠 있으면 무시 (스토리 우선)
  if (isStoryOpen()) return;
  openWindow(app, buildCtx());
}

// ── Story 시스템 이벤트 실행 ──
function runStory(eventId) {
  const event = os.eventMap.get(eventId);
  if (!event) { console.error(`[ghostos] 존재하지 않는 이벤트: ${eventId}`); return; }

  const beforeHour = absOf(os.state.time);

  // 진입 효과 적용 + deliver 발송
  const { state, deliver: toDeliver } = enterEvent(os.state, event);
  os.state = state;
  dispatchDeliver(toDeliver);

  // 진입 효과로 시간이 점프했으면(예: 챕터 경계) 만료/예약뉴스 체크
  if (absOf(os.state.time) > beforeHour) {
    os.state = checkExpiries(os.state, os.eventMap);
    const { state: ns, published } = checkScheduledNews(os.state);
    os.state = ns;
    for (const p of published) notifyForEvent(os.eventMap.get(p.id), os.characters);
  }
  commit();

  showStory({
    event,
    state: os.state,
    onChoice: (idx) => handleStoryChoice(event, idx),
    onDismiss: () => { hideStory(); renderDesktop(os.state); },
  });
}

// 절대시간 헬퍼 (state.time → 숫자)
function absOf(t) { return (t?.day ?? 1) * 24 + (t?.hour ?? 0); }

function handleStoryChoice(event, choiceIndex) {
  const choice = event.choices?.[choiceIndex];
  const { state, nextEventId, timeAdvanced, deliver: toDeliver } =
    chooseOption(os.state, event, choiceIndex);
  os.state = state;

  dispatchDeliver(toDeliver);
  if (timeAdvanced) {
    os.state = checkExpiries(os.state, os.eventMap);
    // 예약 발행 뉴스: 발행 시각이 됐으면 등장 + 알림
    const { state: ns, published } = checkScheduledNews(os.state);
    os.state = ns;
    for (const p of published) {
      notifyForEvent(os.eventMap.get(p.id), os.characters);
    }
  }
  commit();

  // dismiss: true면 다음 스토리로 넘기지 않고 데스크톱으로 제어권을 넘긴다.
  // (플레이어가 Mail 등을 직접 열어 확인하도록. 이어지는 스토리는 앱의 action이 트리거)
  if (choice?.dismiss) {
    hideStory();
    renderDesktop(os.state);
    return;
  }

  if (nextEventId) {
    runStory(nextEventId);
  } else {
    // 다음 스토리 없음 → 오버레이 닫고 데스크톱 복귀
    hideStory();
    renderDesktop(os.state);
  }
}

// deliver 목록을 상태에 반영하고, 각 이벤트를 알림으로 띄운다
function dispatchDeliver(ids) {
  if (!ids?.length) return;
  os.state = deliver(os.state, ids, os.eventMap);
  for (const id of ids) {
    const evt = os.eventMap.get(id);
    // 지연 발행 뉴스는 여기서 알림을 띄우지 않는다 (발행되는 순간에만 알림).
    // 지연 없는 뉴스는 즉시 발행되므로 알림을 띄운다.
    if (evt?.kind === 'news') {
      const delay = (evt.delayDays ?? 0) * 24 + (evt.delayHours ?? 0);
      if (delay > 0) continue;
    }
    notifyForEvent(evt, os.characters);
  }
}

// ── 부팅 ──
export async function boot() {
  cacheElements();

  const { map, errors } = buildEventMap(eventsData);
  os.eventMap = map;
  if (errors.length) console.warn('[ghostos] 이벤트 데이터 문제:\n' + errors.join('\n'));

  // 세이브 로드 (손상 방어)
  let saved = null;
  try {
    saved = load(AUTOSAVE_SLOT);
    if (saved && (!saved.time || typeof saved.money !== 'number')) saved = null;
  } catch { saved = null; }
  const isResume = Boolean(saved);
  os.state = createState(saved ?? initialStateData);

  // 서브시스템 초기화
  initDesktop(
    { topbar: os.el.topbar, desktop: os.el.desktop, taskbar: os.el.taskbar },
    { onOpenApp: openApp }
  );
  initWindows(os.el.windows, { onClose: () => renderDesktop(os.state) });
  initStoryOverlay(os.el.story);
  initNotifications(os.el.notifs, { onOpenApp: openApp });

  // 부팅 연출 → 데스크톱 표시
  await bootSequence(os.el.boot);
  os.el.boot.style.display = 'none';
  os.el.ghostos.hidden = false;

  renderDesktop(os.state);

  // 시작: currentEvent가 스토리면 실행. 이어하기면 데스크톱만 띄우고 대기.
  const startId = os.state.currentEventId ?? 'EVT_INTRO';
  const startEvt = os.eventMap.get(startId);
  if (!isResume && startEvt?.kind === 'story') {
    runStory(startId);
  } else if (isResume && startEvt?.kind === 'story') {
    // 이어하기: 마지막 스토리를 다시 띄우되 진입효과 재적용 없이
    showStory({
      event: startEvt,
      state: os.state,
      onChoice: (idx) => handleStoryChoice(startEvt, idx),
      onDismiss: () => { hideStory(); renderDesktop(os.state); },
    });
  }
}

function cacheElements() {
  os.el = {
    boot: document.getElementById('boot'),
    ghostos: document.getElementById('ghostos'),
    topbar: document.getElementById('os-topbar'),
    desktop: document.getElementById('os-desktop'),
    taskbar: document.getElementById('os-taskbar'),
    windows: document.getElementById('os-windows'),
    story: document.getElementById('story-overlay'),
    notifs: document.getElementById('os-notifications'),
  };
}

// 개발 편의
export function devTools() {
  return {
    state: () => os.state,
    hidden: () => os.state.hidden,
    reset: () => { localStorage.clear(); location.reload(); },
    open: (id) => openApp(id),
    story: (id) => runStory(id),
  };
}
