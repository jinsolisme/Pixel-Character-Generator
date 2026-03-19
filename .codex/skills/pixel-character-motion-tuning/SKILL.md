---
name: pixel-character-motion-tuning
description: Pixel Character Generator 레포에서 Copy Params 기반 모션 수정, hat/glasses/bubble/fire/flag/laptop 같은 픽셀 오버레이 생성·조정, preview clipping·headroom 수정에 사용하는 저장소 전용 스킬이다.
---

# Pixel Character Motion Tuning

이 스킬은 이 저장소 전용이다. 캐릭터 모션, Copy Params 기반 케이스 수정, 머리 위/몸 주변 픽셀 오버레이 생성·조정, preview 상단 여백과 clipping 문제를 같은 흐름으로 다룬다.

핵심 작업 파일:
- `src/animations.ts`: 몸 프레임, 팔/다리 모션, 액션 타이밍
- `src/App.tsx`: 액션 버튼, 오버레이 픽셀, canvas/SVG export
- `src/components/CharacterPreview.tsx`: preview padding, stage offset, SVG overflow
- `src/motion-config.ts`: `currentFrameDy`, 모션 fps, 세로 이동 동기화

## 트리거 사례

다음 같은 요청에 이 스킬을 사용한다.
- "Hi 모션 이상해", "walk 발이 떨어져 보여"
- "Copy Params 붙일게, 이 케이스만 고쳐줘"
- "hat 버튼 옆에 새 에셋 하나 만들어줘"
- "말풍선/불/별 같은 걸 새로 생성해줘"
- "hat/glasses/bubble/fire 위치나 크기 다시 맞춰줘"
- "말풍선/별/불이 위에서 잘려 보여"
- "preview 카드 위쪽 여백 더 줘"

## 입력 정리

사용자가 Copy Params를 붙여주면 아래 값을 우선 본다.
- 팔이나 wave 계열 모션: `sideDetailType`, `shoulder`, `armCells`
- 걷기나 다리 문제: `leftLegCells`, `rightLegCells`
- 머리 위/머리 근처 오버레이: `headInfo`
- 눈 기준 오버레이: `eyeCells`

새 에셋 생성 요청이면 아래를 먼저 확정한다.
- 에셋 종류: hat / bubble / fire / glasses / flag / laptop / 기타
- 붙는 위치: 머리 위 / 눈 / 손 / 몸 뒤 / 몸 앞
- 그리드: `16x16` 본체 픽셀인지, `32x32` fine overlay인지
- 스타일: 픽셀 아트 여부, 단색/3색 제한, row 기반인지 SVG 포인트인지
- 동기화: `currentFrameDy`로 같이 움직여야 하는지
- 범위: preview만인지, PNG/SVG export까지 동일 반영인지

## 작업 흐름

1. `src/animations.ts`, `src/App.tsx`, `src/components/CharacterPreview.tsx`를 먼저 확인한다.
2. 수정 위치를 아래 중 하나로 분류한다.
- `src/animations.ts`의 애니메이션 프레임
- `App.tsx`의 16x16 액세서리 픽셀
- `App.tsx`의 32x32 fine-pixel 오버레이
- `CharacterPreview.tsx`의 preview padding, stage offset, SVG overflow
3. anchor는 아래 우선순위로 잡는다.
- 머리 위: `headInfo`
- 눈 기준: `eyeCells`
- 손/팔 기준: `shoulder`, `armCells`, error flag anchor
- 마지막 fallback: body bounds
4. 사용자가 크게 바꿔 달라고 하지 않았다면 기존 실루엣을 유지한다.
5. preview에 보이는 에셋은 canvas export와 SVG export에도 같이 반영한다.
6. 새 액션을 추가하면 `AnimationType`, `activeMotion`, `animFrames` 분기, 필요 시 `MOTION_FPS`까지 같이 연결한다.

## 구현 규칙

- 큰 재작성보다 작은 프레임 수정으로 해결하는 쪽을 우선한다.
- 팔 모션은 이 레포의 shoulder/arm-cell 모델을 재사용하고, 임의의 자유형 픽셀은 마지막 수단으로만 쓴다.
- 픽셀 아트 요청이면 벡터보다 row/cell 기반 정의를 우선한다.
- 새 에셋 생성 요청이면 먼저 anchor, grid, 색 제한, 움직임 연동 여부를 고정하고 그다음 shape를 만든다.
- 세로 동기화는 별도 시스템보다 `currentFrameDy`를 우선 재사용한다.
- `idle`과 `null` 의미를 유지한다. `idle`은 애니메이션, `null`은 완전 정지다.
- preview가 잘리면 sprite scale보다 먼저 top padding, stage offset, SVG root `overflow: visible`을 본다.

## 검증

- `npm run lint`
- `npm run build`
- 사용자가 어떤 버튼이나 토글을 눌러서 확인하면 되는지 함께 안내한다.
- 특정 params 케이스를 기준으로 요청한 수정이면, 그 케이스를 우선 기준으로 검증한다.
