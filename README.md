# GhostLock

OS UI 기반 하이퍼텍스트 내러티브 시뮬레이션 게임. (개발명세서 구현)

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 구조

```
src/
├─ main.js            진입점. 엔진↔UI 오케스트레이션 (명세서 5.3 실행 흐름)
├─ engine/            순수 로직 — DOM을 전혀 모른다. 나중에 서버에서 그대로 재사용 가능.
│  ├─ state.js        게임 상태 생성/정규화 (3.1)
│  ├─ event.js        이벤트 로딩·검증·선택 처리 (3.2, 2.1 루프)
│  ├─ condition.js    조건 평가기 (3.3)
│  ├─ effect.js       효과 적용기, 불변 (3.4)
│  ├─ time.js         시간 시스템, 수동 진행 (3.5)
│  └─ save.js         세이브/로드. localStorage → 서버 교체 대비 추상화
├─ ui/                DOM 렌더링 (Ghost OS)
│  ├─ boot.js         부팅 연출
│  ├─ terminal.js     타이핑 애니메이션
│  ├─ panel.js        패널(채널) 정의/전환
│  └─ render.js       상태바·이벤트·선택지 렌더
├─ data/              콘텐츠 (코드 수정 없이 확장)
│  ├─ events.json     이벤트 체인 ← 여기에 스토리를 추가
│  ├─ characters.json
│  └─ initialState.json
└─ styles/style.css   CRT 터미널 스타일
```

## 설계 원칙

- **engine/ 은 DOM을 모른다.** 순수 함수 `(state, choice) → newState`. 그래서 이
  엔진을 그대로 Node 서버에 올려 세이브 서버/멀티플레이로 확장할 수 있다. UI는
  state를 받아 그리기만 한다.
- **이벤트는 데이터.** 새 스토리는 코드 수정 없이 `events.json`에 노드만 추가.
  로딩 시 스키마 검증 + `next` 참조 무결성 검사를 하므로, 오타난 이벤트가 조용히
  게임을 깨먹지 않는다 (콘솔에 경고, 게임은 계속 동작).

## 이벤트 추가하는 법

`events.json`에 노드 하나를 추가하면 된다:

```jsonc
{
  "id": "EVT_XXX",
  "title": "화면 제목",
  "panel": "mail",              // event | mail | chat | terminal | intel
  "text": "본문. \n 으로 줄바꿈.",
  "condition": { "rank": ">= 2", "flags": ["joined", "!caught"] },  // 등장 조건(선택)
  "effects": [                   // 진입 시 자동 효과(선택)
    { "type": "stress", "value": 5 }
  ],
  "choices": [
    {
      "text": "> accept",
      "next": "EVT_YYY",         // 다음 이벤트 id
      "condition": { "money": ">= 100" },  // 선택지 잠금 조건(선택)
      "effects": [ { "type": "money", "value": -100 } ],
      "cost": 2                  // 소모 시간(시간 단위, 선택)
    }
  ]
  // "ending": true 를 주면 choices 없이 엔딩 노드가 된다
}
```

**효과 타입:** `money` `stress` `rank` (누적), `set`(절대값), `flag`(플래그 설정), `time`(시간 진행).
**조건:** 숫자 비교(`">= 2"`), `flags`(존재/부재, `!` 접두), `time`, `all`/`any` 결합.

## 개발 편의

브라우저 콘솔에서:
- `GHOSTLOCK.state()` — 현재 상태 확인
- `GHOSTLOCK.reset()` — 세이브 삭제 후 새 게임

## 로드맵

1. ✅ 엔진 코어 (state/event/condition/effect/time/save)
2. ✅ Ghost OS UI (부팅/터미널/패널/렌더)
3. ✅ 콘텐츠 파이프라인 (JSON + 검증) + 세이브/로드
4. ⬜ 엔딩 분기 화면, INTEL/CHAT 패널 고유 UI
5. ⬜ 콘텐츠 채우기 (챕터 2~엔딩)
6. ⬜ (선택) 서버 확장 — engine/을 Node로 이식, save.js를 API로 교체
```
