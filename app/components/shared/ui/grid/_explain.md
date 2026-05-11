# PqGrid 컴포넌트 가이드

---

## 1. Props 상세 설명

| Prop 명              | 타입                | 필수 | 기본값                  | 설명                                                                                                                     |
| :------------------- | :------------------ | :--: | :---------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **gridId**           | `string`            | Yes  | -                       | 그리드 인스턴스를 식별하는 고유 ID입니다. 모든 페이지 내에서 중복될 수 없습니다.                                         |
| **colModel**         | `Array<ColModel>`   | Yes  | -                       | 컬럼 정의 배열입니다. 헤더명, 데이터 인덱스, 에디터 타입 등을 설정합니다.                                                |
| **url**              | `string`            | Yes  | -                       | API 통신의 기본 엔드포인트입니다. urlGet을 별도로 지정하지 않았다면 해당 url로 기본 조회를 진행합니다(예: `/api/sample`) |
| **gridTitle**        | `string`            |  No  | `undefined`             | 그리드 상단에 표시될 제목입니다.                                                                                         |
| **buttonsShow**      | `object`            |  No  | `{search, reset, save}` | 상단 버튼(`조회`, `초기화`, `저장`)의 노출 여부를 제어합니다.                                                            |
| **options**          | `pq.gridT.options`  |  No  | `DefaultOptions`        | pqGrid의 공식 API 옵션을 직접 전달하여 기본 설정을 확장하거나 덮어씁니다.                                                |
| **urlGet**           | `string`            |  No  | `props.url`             | 데이터 조회(GET) 시 사용할 별도 URL입니다.                                                                               |
| **urlPost**          | `string`            |  No  | `url + "/process"`      | 데이터 저장(POST) 시 사용할 별도 URL입니다.                                                                              |
| **sendItemType**     | `string`            |  No  | `""`                    | 멀티 그리드 환경에서 자신의 역할(`head`, `item`, `sub`)을 정의합니다.                                                    |
| **getInit**          | `object`            |  No  | `undefined`             | 조회 API 호출 시 항상 포함될 기본 쿼리 파라미터입니다.                                                                   |
| **toolbarItems**     | `ToolbarItems`      |  No  | -                       | 그리드 툴바 내 기능 버튼(`add`, `delete`, `find` 등)의 활성화 여부입니다.                                                |
| **skipCreDateUser**  | `boolean`           |  No  | `false`                 | `true` 설정 시 생성일/자/자 컬럼을 자동으로 추가하지 않습니다.                                                           |
| **skipLmoDateUser**  | `boolean`           |  No  | `false`                 | `true` 설정 시 수정일/자/자 컬럼을 자동으로 추가하지 않습니다.                                                           |
| **needState**        | `boolean`           |  No  | `true`                  | 행의 상태(추가/수정/삭제)를 관리하는 체크박스 컬럼 생성 여부입니다.                                                      |
| **onlyInsertGrid**   | `boolean`           |  No  | `false`                 | `true`이면 저장 후 그리드를 새로고침하지 않고 초기화합니다. (등록 전용)                                                  |
| **searchConditions** | `Array<SearchList>` |  No  | `[]`                    | 상단 검색 영역에 조회 조건이 될 `Vueform` 기반 필드들을 정의합니다.                                                      |

---

## 2. 주요 데이터 타입 (Type Definitions)

### A. ColModel (그리드 컬럼 설정)

`pq.gridT.column`을 확장하며, 다음과 같은 특수 속성을 가집니다.

| 속성명              | 타입                           | 설명                                                                                                                                                                                                                                                                 |
| :------------------ | :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **dataIndx**        | `string \| number`             | **(필수)** 데이터 객체에서 매핑할 키 값입니다.                                                                                                                                                                                                                       |
| **title**           | `string \| Function`           | 그리드 헤더에 표시될 이름입니다. 함수형으로 동적 설정이 가능합니다.                                                                                                                                                                                                  |
| **dataType**        | `string`                       | 데이터의 유형입니다. (`string`, `integer`, `float`, `date`, `time`, `bool`) <br> - `integer`: `#,###` 포맷 자동 적용 <br> - `float`: `#,###.000` 포맷 자동 적용 <br> - `date`: `YYYY-MM-DD` 포맷 및 달력 에디터 적용 <br> - `time`: `HH:mm` 포맷 및 시간 에디터 적용 |
| **editable**        | `boolean \| Function`          | 셀의 편집 가능 여부입니다. 함수를 통해 특정 조건(예: 특정 상태값일 때만)에서 편집을 제한할 수 있습니다.                                                                                                                                                              |
| **editableNewOnly** | `boolean`                      | `true` 설정 시, `addRow`로 추가된 행(신규 데이터)만 편집 가능하며 기존 서버에서 불러온 데이터는 읽기 전용이 됩니다.                                                                                                                                                  |
| **init**            | `string \| number \| Function` | 신규 행 추가 시 해당 컬럼에 들어갈 초기값입니다. <br> 함수 사용 시 `{ parentRow, currentRow, pqgridData }` 등을 인자로 받아 계산된 값을 반환할 수 있습니다.                                                                                                          |
| **validations**     | `Array<object>`                | 데이터 유효성 검사 규칙입니다. (아래 상세 설명 참조)                                                                                                                                                                                                                 |
| **onChangeMake**    | `Array<object>`                | 현재 셀의 값이 바뀔 때 다른 셀(`target`)의 값을 자동으로 갱신하는 로직입니다. (예: 단가 \* 수량 = 금액 자동계산)                                                                                                                                                     |
| **optionListRef**   | `Ref<Array>`                   | 에디터 타입이 `select`일 때 사용할 옵션 리스트입니다. `ref`를 연결하면 외부에서 데이터가 바뀔 때 그리드 내 옵션도 자동 갱신됩니다.                                                                                                                                   |
| **optionFilter**    | `Function`                     | 행마다 셀렉트 박스의 옵션을 다르게 보여줘야 할 때 사용하는 필터 함수입니다.                                                                                                                                                                                          |
| **isKey**           | `boolean`                      | `true` 설정 시, 데이터 저장 시 해당 컬럼의 변경 전 값(`beforeDataIndx`)을 함께 서버로 전송합니다.                                                                                                                                                                    |
| **isParentKey**     | `boolean`                      | 자식 그리드에서 사용하며, 부모 그리드의 특정 값을 자신의 초기값으로 가져올 때 식별자로 사용됩니다.                                                                                                                                                                   |
| **render**          | `Function`                     | 셀의 출력 형태를 커스터마이징합니다. optionListRef를 사용할 경우 기본적으로 설정되어 있습니다.                                                                                                                                                                       |

#### 상세 로직 예시

**1) 유효성 검사 (Validations)**
`PqGrid`는 저장(`saveStart`) 시점에 자동으로 검증을 수행합니다.

```javascript
validations: [
  { type: "nonEmpty" },
  { type: "minLen", value: 2 },
  { type: "unique" }, // 그리드 내 현재 컬럼 중복 체크
  { type: "regexp", value: /^[0-9]+$/, msg: "숫자만 입력 가능합니다." },
];
```

**2) 초기값 설정 (Init Function)**
마스터-디테일 구조에서 부모의 키 값을 자식의 신규 행에 자동으로 넣을 때 유용합니다.

- **`onChangeMake`**: 특정 셀의 값이 변경될 때 다른 셀의 값을 자동으로 계산/변경하는 반응형 로직입니다.
  ```typescript
  onChangeMake: [
    {
      target: "totalPrice",
      value: ({ currentRow }) => currentRow.qty * currentRow.price,
    },
  ];
  ```
- **`optionListRef`**: `Select` 타입 에디터에서 사용할 반응형 데이터입니다. API로 받아온 목록을 연결할 때 사용합니다.
- **`validations`**: 유효성 검사 규칙입니다. `nonEmpty`, `unique`, `maxLen` 등을 지원합니다.

### B. SearchList (상단 검색 조건 설정)

상단 `Vueform` 검색 바를 구성하는 요소입니다.

- **`elementType`**: `select`, `multiselect`, `date`, `singleDate`, `monthDate`, `checkbox`, `radio`, `toggle`, `text`.
- **`defaultvalue`**: `true`로 설정하면 오늘 날짜나 리스트의 첫 번째 항목을 자동으로 기본값으로 선택합니다.
- **`searchElementItem`**: `select`나 `radio` 등에서 사용할 옵션 리스트(배열 또는 Ref)입니다.

---

## 3. 핵심 작동 메커니즘

### 데이터 조회 (Read)

1. 조회버튼을 클릭했을때 `handleSearchClick`을 호출합니다.
2. `searchConditions`에 정의된 `required` 항목을 검증합니다.
3. `useAPIFetch`를 통해 `urlGet` 주소로 `searchParameters`를 쿼리 스트링에 담아 호출합니다.
4. 응답 데이터에 `rowkey`가 없으면 `getRowKey` 유틸을 통해 고유 키를 생성하여 바인딩합니다.

### 데이터 저장 (Save)

1. `saveStart` 호출 시 `checkValidBeforeSave`를 통해 수정된 행(`state: true`)들의 유효성을 검사합니다.
2. `convertTheChangesToBodyParams` 함수가 실행되어 그리드의 변경 사항을 `insert`, `update`, `delete` 리스트로 변환합니다.
3. `urlPost` 주소로 데이터를 POST 전송합니다.

### 마스터-디테일 연동 (Master-Detail)

1. **부모(Master)** 그리드 안에 자식 그리드를 슬롯으로 넣습니다.
2. 부모의 행을 더블클릭(`rowDblClick`)하면 자식 그리드에 `parentRow` 정보가 전달됩니다.
3. 자식 그리드는 부모의 `isKey` 컬럼 값을 `searchParameters`로 사용하여 자동으로 데이터를 조회(`execute`)합니다.
4. `provide/inject`를 통해 `gridBoxSet`에 자신의 인스턴스를 등록하여, 부모 그리드에서 저장 버튼 클릭 시 자식 그리드의 데이터까지 한 번에 전송할 수 있습니다.

---

## 4. 슬롯 (Slots)

- **`extraButtons`**: 그리드 우상단 저장 버튼 옆에 커스텀 버튼을 배치합니다.
- **`extraItemInput`**: 그리드 하단 영역에 추가적인 입력 폼이나 정보를 표시합니다.

---

## 5. 노출 메서드 (Expose)

부모 컴포넌트에서 `ref`를 통해 다음 함수들을 직접 호출할 수 있습니다.

```typescript
const gridRef = ref();

gridRef.value.searchStart(); // 데이터 새로고침
gridRef.value.saveStart(); // 저장 로직 실행
gridRef.value.searchReset(); // 검색 조건 및 그리드 초기화
gridRef.value.theGrid; // pqGrid 인스턴스 직접 제어
```

---

## 6. 사용 예시 (ColModel Validation & Unique)

```javascript
const colModel = [
  {
    title: "코드",
    dataIndx: "cd",
    dataType: "string",
    editable: true,
    validations: [
      { type: "nonEmpty" },
      { type: "unique" }, // 그리드 내 중복 체크
    ],
  },
  {
    title: "수량",
    dataIndx: "qty",
    dataType: "integer",
    editable: true,
    onChangeMake: [
      {
        target: "amt",
        value: ({ currentRow }) => currentRow.qty * currentRow.price,
      },
    ],
  },
];
```
