import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useGridOperations } from "./useGridOperations";
import dayjs from "dayjs/esm/index.js";

// 1. API 및 Nuxt 의존성 모의화(Mocking)
const mockApi = vi.fn().mockResolvedValue({ ok: true });
const mockRefresh = vi.fn();

mockNuxtImport("useNuxtApp", () => {
  return () => ({
    $api: mockApi,
  });
});

// useFetch는 reactive ref들을 함께 노출해야 내부 watch 등과 호환됨.
mockNuxtImport("useFetch", () => {
  return (url: string, opts: any) => {
    return {
      status: ref("idle"),
      data: ref([]),
      refresh: mockRefresh,
      execute: vi.fn(),
    };
  };
});

// 2. 브라우저 전역 API 모의화
const confirmSpy = vi.spyOn(window, "confirm");
const alertSpy = vi.spyOn(window, "alert");

describe("useGridOperations 런타임 동작 단위 테스트", () => {
  // 공통 컴포저블 주입 파라미터 빌더
  const createMockContext = (propsOverrides = {}) => {
    const theGrid = ref({
      value: {
        showLoading: vi.fn(),
        hideLoading: vi.fn(),
        isValid: vi.fn().mockReturnValue({ valid: true }),
        getChanges: vi.fn().mockReturnValue({
          addList: [],
          updateList: [],
          deleteList: [],
          oldList: [],
        }),
        Checkbox: () => ({ getCheckedNodes: () => [] }),
      },
    });

    const vueformRef = ref({
      reset: vi.fn(),
      validate: vi.fn(),
      elements$: {},
    });

    return {
      theGrid,
      vueformRef,
      parentRow: ref({}),
      searchParameters: ref({}),
      selectedMonth: ref({ year: 2026, month: 4 }), // 5월 (0-based assumed in test logic if relevant)
      gridBoxSet: ref({}),
      props: {
        url: "/api/sample",
        colModel: [],
        searchConditions: [],
        ...propsOverrides,
      },
      emit: vi.fn(),
      t: (k: string) => k,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    confirmSpy.mockReset().mockReturnValue(true); // 기본 허용
    alertSpy.mockReset();
  });

  it("SR_01: confirmIsEditing()는 편집 중일 때 확인 창을 띄워야 한다", () => {
    // Given: helpers.ts의 getIsEditing을 스터빙하는 대신 grid의 상태를 조작하여 판별 유도
    // theGrid mock의 getChanges가 수정내역을 가진것처럼 반환
    const context = createMockContext();
    context.theGrid.value.getChanges = vi.fn().mockReturnValue({
      updateList: [{ state: true }],
      oldList: [{ id: 1 }],
    });

    const ops = useGridOperations(context as any);

    // when: confirm에서 사용자가 '취소'를 눌렀다고 가정
    confirmSpy.mockReturnValue(false);
    const result = ops.confirmIsEditing(context.theGrid, context.gridBoxSet);

    // then: confirm 창이 호출되었고, 최종 true(편집중 차단)를 반환하는지 확인
    expect(confirmSpy).toHaveBeenCalled();
    // confirmIsEditing 내에서 !confirm() 이 true 이면 return true 임.
    expect(result).toBe(true);
  });

  it("SR_02: searchStart() 실행 시 useFetch의 refresh API가 기동되어야 한다", () => {
    const context = createMockContext();
    const ops = useGridOperations(context as any);

    ops.searchStart(true); // forced=true로 confirmIsEditing 우회

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("SR_03: searchReset() 호출 시 파라미터 객체 초기화 및 vueform reset이 연계된다", () => {
    const context = createMockContext();
    context.parentRow.value = { oldKey: "someValue" };
    const ops = useGridOperations(context as any);

    ops.searchReset();

    expect(context.parentRow.value).toEqual({});
    expect(context.vueformRef.value.reset).toHaveBeenCalled();
  });

  it("VL_01: checkValidBeforeSave() 는 그리드 검증 실패 시 즉각 null을 반환하고 알림을 출력해야 한다", () => {
    const context = createMockContext();
    // 1. 체크된 행 생성
    context.theGrid.value.Checkbox = vi.fn().mockReturnValue({
      getCheckedNodes: () => [{ pq_ri: 0 }],
    });
    // 2. 변경 내역 생성
    context.theGrid.value.getChanges = vi.fn().mockReturnValue({
      addList: [{ state: true }],
      updateList: [],
      deleteList: [],
    });
    // 3. 유효성 실패 모의
    context.theGrid.value.isValid = vi.fn().mockReturnValue({
      valid: false,
      msg: "필수 입력 누락",
      column: { title: "사용자명" },
    });

    const ops = useGridOperations(context as any);

    const validationResult = ops.checkValidBeforeSave(context.theGrid);

    expect(validationResult).toBeNull();
    expect(alertSpy).toHaveBeenCalled(); // 사용자 경고 알림 발생 확인
  });

  it("DT_01: handleMonthDate() 는 전달받은 연/월 객체를 YYYYMMDD 형태의 검색 범위(배열)로 변환한다", () => {
    const context = createMockContext({
      searchConditions: [{ key: "searchPeriod", elementType: "monthDate" }],
    });
    const ops = useGridOperations(context as any);

    // input: year: 2024, month: 1 (2월을 의미함 - js month 0-indexed input -> code logic handles `month+1`)
    ops.handleMonthDate({ year: 2024, month: 1 });

    const outputRange = context.searchParameters.value["searchPeriod"];

    // code: `month + 1` => 2월.  2024년 2월은 윤년이라 29일까지.
    expect(outputRange).toBeDefined();
    expect(outputRange[0]).toBe("20240201");
    expect(outputRange[1]).toBe("20240229"); // endOf month valid
  });
});
