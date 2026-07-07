// save.js — 세이브/로드 (명세서 6.2 확장 기능)
//
// 지금은 localStorage 기반이지만, 인터페이스를 추상화해서
// 나중에 서버 API로 교체할 때 이 파일의 구현부만 바꾸면 되도록 했다.
// (save/load/list/remove 시그니처는 유지 → 호출부 무수정)

import { serializeState } from './state.js';

const PREFIX = 'ghostlock:save:';
const SCHEMA_VERSION = 1;

/** 슬롯에 현재 state 저장 */
export function save(slot, state) {
  const payload = {
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    state: serializeState(state),
  };
  try {
    localStorage.setItem(PREFIX + slot, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('[save] 저장 실패:', err);
    return false;
  }
}

/** 슬롯에서 state 로드. 없거나 손상 시 null */
export function load(slot) {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (payload.version !== SCHEMA_VERSION) {
      console.warn('[save] 스키마 버전 불일치 — 마이그레이션 필요할 수 있음');
    }
    return payload.state;
  } catch (err) {
    console.error('[save] 로드 실패:', err);
    return null;
  }
}

/** 저장된 슬롯 목록 (메타데이터 포함) */
export function listSaves() {
  const saves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      const payload = JSON.parse(localStorage.getItem(key));
      saves.push({
        slot: key.slice(PREFIX.length),
        savedAt: payload.savedAt,
        day: payload.state?.time?.day,
      });
    } catch { /* 손상된 슬롯 무시 */ }
  }
  return saves.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
}

export function removeSave(slot) {
  localStorage.removeItem(PREFIX + slot);
}
