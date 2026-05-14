import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";

import { useGridSetup } from "./useGridSetup";
import { ClassHeadFromEditable } from "../lib/grid.constants";

// Mock third-party library that triggers DOM errors on mount
vi.mock("pqgrid", () => ({
  default: {
    grid: vi.fn().mockReturnValue({
      on: vi.fn(),
      showLoading: vi.fn(),
      hideLoading: vi.fn(),
    }),
  },
}));

// Mocking nested dependencies relying on Nuxt context
mockNuxtImport("useNuxtApp", () => {
  return () => ({
    $api: vi.fn(),
    $i18n: {
      t: (k: string) => k,
    },
  });
});

// global auto-import functions mock setup
vi.stubGlobal("watchDebounced", vi.fn());

describe("useGridSetup 상세 단위 테스트", () => {
  // 공용 옵션 더미 생성기
  const createMockOptions = (propsOverrides = {}) => ({
    theGrid: ref(null),
    vueformRef: ref(null),
    parentRow: ref({}),
    searchParameters: ref({}),
    selectedMonth: ref({ year: 2026, month: 5 }),
    props: {
      colModel: [],
      gridId: "test-grid-unit-01",
      ...propsOverrides,
    },
    t: (key: string) => key, // 다국어 매핑 모조
    iAmSubGridOf: undefined,
    givenGridBoxSet: undefined,
    operations: {
      getdataFetching: { execute: vi.fn() },
      handleMonthDate: vi.fn(),
      deleteValidationFocus: vi.fn(),
    },
  });

  // Composable 실행을 위한 가상 Vue Lifecycle 컴포넌트 Wrapper
  const runSetup = (options: any) => {
    let result: any;
    mount({
      setup() {
        result = useGridSetup(options);
        return () => null;
      },
    });
    return result;
  };

  it("UT_01: editableNewOnly 지정 시 적절한 스타일 클래스(new-only)가 주입된다", () => {
    const options = createMockOptions({
      colModel: [{ dataIndx: "targetCol", editableNewOnly: true }],
    });

    const { optionsIN } = runSetup(options);
    const target = optionsIN.colModel.find((c: any) => c.dataIndx === "targetCol");

    expect(target.clsHead).toBe(ClassHeadFromEditable["new-only"]);
  });

  it("UT_02: dataType이 time인 경우 정규식을 사용해 6자리 숫자를 HH:MM 형태로 포맷팅한다", () => {
    const options = createMockOptions({
      colModel: [{ dataIndx: "tfield", dataType: "time" }],
    });

    const { optionsIN } = runSetup(options);
    const target = optionsIN.colModel.find((c: any) => c.dataIndx === "tfield");

    // logic is: val.replace(/(\d{2})(\d{2})(\d{2})/g, "$1:$2")
    // input: "143055" -> Output: "14:30" (from code logic: 1:2 pair only uses $1:$2, dropping $3)
    const formatted = target.format("143055");
    expect(formatted).toBe("14:30");
  });

  it("UV_01: minLen 밸리데이터 팩토리가 기준 길이에 미달하는 값에 대해 false를 리턴한다", () => {
    const options = createMockOptions({
      colModel: [
        {
          dataIndx: "name",
          validations: [{ type: "minLen", value: 5 }],
        },
      ],
    });

    const { optionsIN } = runSetup(options);
    const col = optionsIN.colModel.find((c: any) => c.dataIndx === "name");
    const validatorFunc = col.validations[0].type;

    expect(typeof validatorFunc).toBe("function");
    // 3글자 대입 시 false 반환
    expect(validatorFunc({ value: "abc" })).toBe(false);
    // 5글자 대입 시 undefined(유효) 반환
    expect(validatorFunc({ value: "abcde" })).not.toBe(false);
  });

  it("UV_02: lte(이하) 제약 조건기가 주어진 경계값을 초과할 때 즉각 실패 판정을 내린다", () => {
    const options = createMockOptions({
      colModel: [
        {
          dataIndx: "qty",
          validations: [{ type: "lte", value: 100 }],
        },
      ],
    });

    const { optionsIN } = runSetup(options);
    const col = optionsIN.colModel.find((c: any) => c.dataIndx === "qty");
    const validatorFunc = col.validations[0].type;

    expect(validatorFunc({ value: 120 })).toBe(false); // 100 초과는 에러
    expect(validatorFunc({ value: 90 })).not.toBe(false); // 100 이하는 통과
  });

  it("UA_01: sortType 정렬기가 데이터 원본 코드가 아닌 노출 라벨 문자열 사전순으로 값을 비교한다", () => {
    // options setup simulating Select Editor behavior
    const editorMock = {
      options: [{ codeA: "Apple" }, { codeB: "Banana" }],
    };
    const options = createMockOptions({
      colModel: [
        {
          dataIndx: "fruit",
          optionListRef: ref([{ codeA: "Apple" }, { codeB: "Banana" }]),
          editor: editorMock,
        },
      ],
    });

    const { optionsIN } = runSetup(options);
    const col = optionsIN.colModel.find((c: any) => c.dataIndx === "fruit");
    const sorter = col.sortType;

    expect(typeof sorter).toBe("function");

    // row1: codeA(Apple), row2: codeB(Banana) => Apple < Banana => -1
    const resultAsc = sorter({ fruit: "codeA" }, { fruit: "codeB" }, "fruit");
    expect(resultAsc).toBe(-1);

    // reverse order => 1
    const resultDesc = sorter({ fruit: "codeB" }, { fruit: "codeA" }, "fruit");
    expect(resultDesc).toBe(1);

    // Same values => 0
    const resultSame = sorter({ fruit: "codeA" }, { fruit: "codeA" }, "fruit");
    expect(resultSame).toBe(0);
  });

  it("UP_01: skipCreDateUser가 false일 때 시스템 Audit 컬럼들이 배열 끝에 추가된다", () => {
    const options = createMockOptions({
      skipCreDateUser: false,
      colModel: [{ dataIndx: "userCol1" }],
    });

    const { optionsIN } = runSetup(options);

    const addedIndxs = optionsIN.colModel.map((c: any) => c.dataIndx);
    // Expect credate, cretime, creuser at tail
    expect(addedIndxs).toContain("credate");
    expect(addedIndxs).toContain("cretime");
    expect(addedIndxs).toContain("creuser");
  });

  it("UP_02: needState(저장/상태용 체크박스) 설정 시, colModel의 0번째 인덱스에 주입된다", () => {
    const options = createMockOptions({
      needState: true,
      colModel: [{ dataIndx: "firstMain" }],
    });

    const { optionsIN } = runSetup(options);

    // check positional behavior
    expect(optionsIN.colModel[0].dataIndx).toBe("state");
    expect(optionsIN.colModel[0].type).toBe("checkbox");
    // 원본 배열 요소는 밀려나야 함
    expect(optionsIN.colModel[1].dataIndx).toBe("firstMain");
  });
});
