# Grid.vue 함수 분석 설명서

`Grid.vue` 내부에 정의된 주요 로직을 실행 타이밍과 목적에 따라 **[A] 초기 렌더링/설정 관련**과 **[B] 런타임 상호작용(조회/저장 등) 관련**으로 나누어 정리했습니다.

---

## [A] 초기 렌더링 및 설정 관련 로직
이 섹션의 로직은 컴포넌트가 마운트되거나 최초 로드 시점에 그리드의 레이아웃, 에디터 옵션, 검증 룰 등을 구성하기 위해 **한 번에 실행되거나 렌더링 타이밍에 결합**되는 성격의 코드입니다.

### A1. `colModel` 순회 초기화 설정 (코드 내 인라인 루프)
*   **설명:** `props.colModel`을 즉시 순회하며 컬럼 타입(integer, float, checkbox, time, date)별 에디터 템플릿, 정합성 검증 규칙(유효성), 서식(`format`) 및 정렬 로직을 일괄 정의합니다.
*   **입력:** `props.colModel`
*   **처리:**
    - 에디터 타입(달력, 타임피커, 체크박스 등) 자동 매핑.
    - validation 조건(`minLen`, `regexp`, `unique` 등)에 맞춘 평가 함수 주입.
    - 상위 키(Parent Key) 바인딩 및 MultiSelect 에디터 초기화.
*   **출력:** 변형된 `props.colModel` (PQGrid 설정의 핵심 데이터로 사용됨)

### A2. `optionsIN` 객체 구성
*   **설명:** PQGrid 컴포넌트를 인스턴스화하기 위한 최종 옵션 객체를 조립합니다.
*   **입력:** 기본 옵션(`DefaultOptions`), `props.options`, `props.toolbarItems` 등
*   **처리:**
    - 상태(체크박스) 컬럼 및 생성일/수정일(`credate`, `lmodate`) 등 공통 컬럼을 자동 배열 병합(`unshift`/`push`).
    - `beforeValidate`, `beforePaste` 등 그리드 레벨의 공통 이벤트 훅 바인딩.
*   **출력:** `optionsIN` (PQGrid 생성자 주입 객체)

### A3. `onMounted` (라이프사이클)
*   **설명:** DOM 로드 직후 PQGrid 인스턴스를 실제로 생성하고 초기 세팅을 완료합니다.
*   **처리:**
    - `pq.grid()` 생성자를 호출해 특정 Element ID에 그리드 렌더링.
    - `setDefault()`를 호출하여 검색 조건 초기화 실행.
    - 하위 그리드인 경우(`iAmSubGridOf`), 부모 행 더블클릭 이벤트와 하위 데이터 조회 연동 트리거 구성.

### A4. `setDefault`
*   **설명:** 각 검색 조건(`searchConditions`)에 설정된 `defaultvalue` 속성을 찾아 초깃값을 채웁니다.
*   **처리:** 날짜(오늘 기준 계산), 드롭다운(첫 번째 항목 자동 선택) 등을 계산하여 `searchParameters`에 할당 후 Vueform UI를 갱신합니다.

### A5. `SelectRenderer`
*   **설명:** 그리드 내부 셀이 **화면에 그려질 때(Rendering)** 호출되어 Value를 Label로 치환합니다.
*   **입력:** `ui` (현재 그리드 셀 데이터)
*   **처리:** 옵션 맵을 탐색하여 현재 셀의 코드 값을 텍스트 라벨로 치환하고, 찾기(Find) 검색어가 있다면 노란색 하이라이팅 태그를 감싸줍니다.
*   **출력:** 화면에 표시될 HTML/문자열

### A6. `makeEditorInColM` / `setSelctionOptionsAgain`
*   **설명:** 동적으로 변하는 셀렉트 박스 배열(`optionListRef`)이 있을 때, 에디터 설정을 재구성하여 화면에 즉시 반영합니다.
*   **처리:** 참조 배열 변경 시 `forEach`로 컬럼별 `options` 맵을 재생성하여 에디터 구성을 동기화합니다.

---

## [B] 런타임 상호작용 (동작 관련 함수)
사용자 이벤트(버튼 클릭, 키 입력) 또는 API 처리 시점에 호출되어 동적으로 실행되는 함수들입니다.

### B1. `handleSearchClick` / `searchStart`
*   **설명:** 조회 플로우 진입점입니다.
*   **처리:** 필수 항목 유효성 검증(필수값 누락 알림)을 통과하면 실제 서버 조회(`getdataFetching.refresh()`)를 가동합니다.

### B2. `saveStart`
*   **설명:** 저장(수정) 처리의 진입점입니다.
*   **처리:** `gridBoxSet` 전반의 유효성을 검사하고, 수정된 카운트(추가/삭제 등)를 취합하여 사용자 컨펌을 얻은 뒤 실제 저장 함수(`postDataFetching`)로 연결합니다.

### B3. `checkValidBeforeSave`
*   **설명:** 저장 직전, 그리드 내부 `.isValid()` API를 이용해 데이터 필드값이 유효한지(필수값 누락 여부 등) 사전 점검합니다.
*   **출력:** 건수 정보 객체 혹은 `null`(실패 시 알림 팝업 유발).

### B4. `postDataFetching`
*   **설명:** 수집 및 가공된 변경 데이터를 백엔드로 POST 전송하는 실제 API 연동부입니다.
*   **처리:** `/process` 주소로 전송하며, 성공 시 데이터 갱신 및 그리드 재조회(혹은 리셋)를 진행합니다.

### B5. `confirmIsEditing`
*   **설명:** 조회 등 다른 동작 시, 현재 작성 중인(수정 중)인 미저장 데이터가 있는지 체크하여 경고 팝업을 발생시킵니다.

### B6. `searchReset`
*   **설명:** 입력된 조회 폼 데이터와 `parentRow` 바인딩 정보를 초기 빈 값으로 돌립니다.

### B7. `handleMonthDate`
*   **설명:** 월 선택 피커의 변경 값을 인지하여, 해당 월의 시작일~종료일 범위 스트링(YYYYMMDD)으로 자동 환산해 검색 파라미터에 채웁니다.

### B8. 기타 유틸
*   **`vueformMounted`**: 폼 DOM 생성 시 인스턴스를 외부로 이벤트 송출.
*   **`deleteValidationFocus`**: Escape 키를 누르면 경고 툴팁 강제 삭제 및 에디트 모드 해제.
*   **`setWatchUniqunessAll`**: 데이터 정합성용 중복 검사 캐시 갱신 트리거.
