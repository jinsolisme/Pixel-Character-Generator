OpenClaw의 상태는 크게 4층이다
비개발자 관점에서는 OpenClaw의 상태를 4개의 층으로 이해하면 가장 쉽다.

1. 대화/세션 상태
이 층은 지금 OpenClaw가 대화 관점에서 어떤 순간에 있는가를 뜻한다.

idle: 쉬고 있거나 다음 요청을 기다리는 상태
processing: 요청을 받고 처리 중인 상태
waiting: 사용자 입력이나 승인, 외부 응답을 기다리는 상태
aborted: 작업이 중간에 멈춘 상태
error: 문제가 발생한 상태
이 층은 게임에서 가장 직관적으로 보이기 좋다.

idle: 조용히 대기하는 아바타
processing: 집중하는 자세, 빨라진 움직임
waiting: 사용자 쪽을 바라보며 멈춰 있는 상태
error: 경고등, 흔들리는 화면 요소
2. 생각/기억 상태
이 층은 OpenClaw가 지금 무엇을 참고해서 생각하고 있고, 기억이 얼마나 차 있는가를 뜻한다.

context loading: 이번 요청에 필요한 규칙과 배경정보를 불러오는 상태
memory pressure: 기억과 문맥이 많이 차서 부담이 커진 상태
compaction: 긴 기록을 요약하고 압축하는 상태
memory flush: 중요한 내용을 오래 남길 수 있도록 정리해서 저장하는 상태
fallback: 원래 계획한 모델이나 경로 대신 다른 경로로 전환한 상태
이 층은 사용자가 평소에는 잘 못 보지만, 실제로는 매우 중요하다. 겉으로는 같은 한 줄 답변처럼 보여도, 내부에서는 지금 기억이 꽉 차 있는지, 원래 모델이 아니라 다른 모델로 우회했는지에 따라 동작 감각이 크게 달라질 수 있다.

3. 실행 상태
이 층은 OpenClaw가 실제로 무슨 일을 하고 있는가를 뜻한다.

tool use: 도구를 사용해 조회하거나 실행하는 상태
browser/workflow action: 브라우저 조작이나 외부 워크플로를 수행하는 상태
queue: 처리 대기 중인 작업이 쌓여 있는 상태
subagent: 보조 작업 단위가 따로 움직이는 상태
heartbeat: 주기적으로 돌아가는 자동 체크나 자동 작업 상태
이 층은 텍스트 응답기보다 작업하는 에이전트라는 느낌을 만들어 준다.

4. 신뢰/권한 상태
이 층은 무엇이 자동으로 가능하고, 무엇은 사용자의 확인이 필요한가를 뜻한다.

approval pending: 승인 요청을 보내고 기다리는 상태
sandbox restriction: 안전 제한 때문에 바로 실행할 수 없는 상태
elevated mode: 더 높은 권한이 필요한 상태
recovery: 오류 이후 복구를 시도하는 상태
이 층은 제품 신뢰감과 직접 연결된다. 비개발자에게 중요한 것은 얼마나 강력한가만이 아니라, 언제 멈추고 내 확인을 기다리는가이기 때문이다.

아래 그림은 이 4개 층을 한 장에 묶어 보여준다.

flowchart TB
  U["겉표면<br/>텍스트 입력 / 텍스트 출력"]

  subgraph L1["1층: 대화/세션 상태"]
    S1["idle"]
    S2["processing"]
    S3["waiting"]
    S4["aborted"]
    S5["error"]
  end

  subgraph L2["2층: 생각/기억 상태"]
    C1["context loading"]
    C2["memory pressure"]
    C3["compaction"]
    C4["memory flush"]
    C5["fallback"]
  end

  subgraph L3["3층: 실행 상태"]
    E1["tool use"]
    E2["browser / workflow action"]
    E3["queue"]
    E4["subagent"]
    E5["heartbeat"]
  end

  subgraph L4["4층: 신뢰/권한 상태"]
    T1["approval pending"]
    T2["sandbox restriction"]
    T3["elevated mode"]
    T4["recovery"]
  end

  U --> L1
  U --> L2
  U --> L3
  U --> L4

## 캐릭터 표현 기준: 필수 상태만 남기기

상태를 전부 캐릭터 모션으로 풀 필요는 없다.  
초기 버전에서는 상태를 아래 3가지 표현 수단으로 나누는 것이 가장 효율적이다.

- 몸체 모션: 캐릭터의 태도, 에너지, 시선 방향으로 보여주는 상태
- 부착 아이템/오브젝트: 손에 든 도구나 주변 패널, 드론, 커서 같은 보조 요소로 보여주는 상태
- 말풍선/헤드 아이콘: 승인, 경고, 대기처럼 의미를 즉시 읽어야 하는 상태

핵심은 모든 상태를 한 번에 다 보여주는 것이 아니라, 사용자가 지금 OpenClaw가 어떤 모드에 있는지 바로 이해하게 만드는 것이다.

### 1. 몸체 모션으로 반드시 보여줄 상태

#### idle
- 기본 대기 상태
- 조용한 호흡, 약한 루프, 중립 시선
- 모든 연출의 기준점이 되므로 반드시 필요하다

#### processing
- 생각 중이거나 작업 중인 상태
- 집중 자세, 빨라진 손이나 눈 움직임, 약한 에너지 이펙트
- 사용자가 가장 자주 체감하는 핵심 상태다

#### waiting
- 사용자 입력, 승인, 외부 응답을 기다리는 상태
- 몸은 멈추고 사용자 쪽을 바라보는 연출이 적합하다
- processing과 분리되어야 지금 멈춘 이유가 읽힌다

### 2. 아이템이나 오브젝트로 보여줄 상태

#### tool use
- 실제 도구 실행이나 외부 작업 수행 상태
- 캐릭터 자체를 과하게 바꾸기보다 손에 도구가 생기거나 주변 작업 오브젝트가 나타나는 방식이 적합하다
- 생각 중인 상태와 실행 중인 상태를 구분해 주는 핵심 표현이다

### 3. 말풍선이나 헤드 아이콘으로 보여줄 상태

#### approval pending
- 사용자 확인이 필요한 상태
- 자물쇠, 승인 배지, 확인 버튼 같은 읽기 쉬운 신호가 적합하다
- 감정 상태가 아니라 정책 상태이므로 모션보다 아이콘 중심이 낫다

#### error
- 문제가 발생한 상태
- 짧은 움찔이나 정지 같은 리액션 뒤 경고 아이콘을 유지하는 방식이 적합하다
- 즉시 읽혀야 하므로 아이콘이 중심이고 모션은 보조여야 한다

## 초기 버전 권장 최소 세트

- 몸체 모션: idle, processing, waiting
- 부착 아이템/오브젝트: tool use
- 말풍선/헤드 아이콘: approval pending, error

이 6개만 있어도 사용자는 대부분의 핵심 상황을 이해할 수 있다.

## 표현 원칙

- 몸체 모션은 태도 변화에만 사용한다
- 아이템과 오브젝트는 작업 종류를 보여줄 때만 사용한다
- 아이콘은 승인, 경고, 판단 상태처럼 의미를 즉시 전달해야 할 때 사용한다
- 한 상태에 모든 표현 수단을 동시에 쓰지 않는다
- 기본은 주 표현 1개와 보조 표현 1개 이하로 제한한다

## 지금은 굳이 분리하지 않아도 되는 상태

아래 상태들은 중요하긴 하지만 초기 캐릭터 표현에서는 독립 상태로 만들 필요가 낮다.

- context loading
- memory pressure
- compaction
- memory flush
- fallback
- browser/workflow action
- queue
- subagent
- heartbeat
- sandbox restriction
- elevated mode
- recovery

이 상태들은 나중에 processing, tool use, approval pending의 변형 연출로 흡수하거나 확장 상태로 추가하는 편이 낫다.

## 현재 모션을 상태에 매핑하기

지금 가진 모션을 보면 모든 상태를 각각의 독립 애니메이션으로 만들기보다는,  
일부는 상태 전용 모션으로 쓰고 일부는 상황성 모션이나 보조 레이어로 쓰는 쪽이 더 자연스럽다.

현재 기준이 되는 모션은 아래와 같다.

- idle
- walk
- jump
- blink
- hi
- laptop
- error

핵심은 `상태 그 자체를 보여주는 모션`과 `상태를 꾸며주는 보조 모션`을 분리하는 것이다.

### 1. 상태 전용으로 보기 좋은 모션

#### idle
- 기본 idle 상태에 바로 매핑할 수 있다
- waiting에서도 강한 제스처가 필요 없을 때 사용할 수 있다
- 조용히 살아 있는 기본 루프로 쓰기 좋다

#### laptop
- processing의 기본 모션으로 가장 적합하다
- context loading에도 자연스럽게 연결된다
- tool use 중에서도 실제로 작업 패널이나 실행감을 보여주고 싶을 때 사용할 수 있다

#### error
- error 상태의 기본 모션으로 사용하기 좋다
- aborted나 강한 sandbox restriction처럼 실패나 중단의 의미가 필요할 때도 확장 가능하다
- 일반 경고보다 실제 문제 발생에 우선 배정하는 편이 읽기 쉽다

### 2. 상황성 모션으로 쓰는 것이 좋은 것들

#### walk
- browser/workflow action 같은 실행 흐름에 잘 맞는다
- tool use 중에서도 뭔가가 진행 중이고 앞으로 움직인다는 느낌을 줄 때 적합하다
- processing의 메인 모션보다는 실행 단계의 보조 표현으로 쓰는 편이 낫다

#### jump
- 상시 상태보다는 전환 순간에 쓰는 것이 좋다
- 예를 들면 작업 시작, 승인 완료, 결과 도착, recovery 성공 같은 순간 연출에 적합하다
- 계속 반복시키면 상태 의미가 약해지므로 이벤트성 모션으로 쓰는 편이 안전하다

#### hi
- approval pending에 잘 맞는다
- waiting for user처럼 사용자의 반응을 직접 기다리는 장면에도 잘 맞는다
- "봐줘", "선택해줘", "확인해줘" 같은 신호 모션으로 읽힌다

### 3. 단독 상태가 아니라 전역 보조 레이어로 보는 것이 좋은 것

#### blink
- idle, waiting, processing 어디에나 얹을 수 있다
- 단독 상태 구분용이라기보다 캐릭터를 살아 있게 보이게 하는 생동감 레이어에 가깝다
- 기본 루프가 너무 정적으로 보일 때 가장 값싸게 품질을 올릴 수 있다

## 상태별 추천 매핑

아래처럼 연결하면 현재 가진 모션만으로도 대부분의 핵심 상태를 커버할 수 있다.

- idle -> idle
- processing -> laptop
- waiting -> idle 또는 hi
- tool use -> laptop 또는 walk
- browser/workflow action -> walk
- approval pending -> hi + 승인 아이콘
- error -> error 또는 빨간 깃발 흔들기
- aborted -> error 계열 변형
- context loading -> laptop의 준비 단계 변형
- memory pressure -> processing 또는 laptop 위에 불 이펙트
- recovery -> jump 같은 짧은 전환 모션

## 강한 이펙트 사용 원칙

### 불
- 가장 잘 맞는 상태는 memory pressure다
- context가 많이 차서 부담이 커진 상태를 "과열"처럼 보여줄 수 있다
- 일반 processing에 상시 적용하면 위험하거나 과부하처럼 읽힐 수 있으므로 임계 상태에서만 쓰는 것이 좋다

### 빨간 깃발 흔들기
- 가장 잘 맞는 상태는 error다
- aborted나 강한 경고 상황에도 확장할 수 있다
- approval pending에도 일부 사용할 수는 있지만, 일반 승인 요청에는 너무 강하게 읽힐 수 있다

## 실무적으로 우선 고정해도 되는 매핑

초기 버전에서는 아래만 고정해도 충분하다.

- idle -> idle
- processing -> laptop
- waiting -> idle 또는 hi
- tool use -> laptop 또는 walk
- approval pending -> hi + 아이콘
- error -> 빨간 깃발 흔들기 또는 error
- memory pressure -> 불 이펙트

이렇게 잡으면 몸체 모션, 아이콘, 보조 이펙트의 역할이 겹치지 않고 각 상태의 의미도 비교적 분명하게 유지된다.
