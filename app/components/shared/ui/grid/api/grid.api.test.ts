import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { loadLayoutSetting } from "./grid.api";

// mockApi definitions
const mockApi = vi.fn();

mockNuxtImport("useNuxtApp", () => {
  return () => ({
    $api: mockApi,
  });
});

/**
 * Grid API - loadLayoutSetting 테스트 슈트
 */
describe("loadLayoutSetting API 로직 테스트", () => {
  beforeEach(() => {
    // 매 테스트 케이스 실행 전 Mock 호출 기록을 초기화합니다.
    vi.clearAllMocks();
  });

  it("네트워크 응답이 유효하지 않거나 그리드 ID가 불일치할 때 기존 Option을 보존하여 반환한다", async () => {
    // 1. 응답 데이터 자체가 null인 경우
    mockApi.mockResolvedValue(null);
    const originalOption = { title: "원본 옵션" };
    let result = await loadLayoutSetting("grid-01", [], originalOption as any);
    expect(result).toBe(originalOption);

    // 2. 응답은 왔으나, 요청한 gridId와 DB의 pgridid가 다를 경우
    mockApi.mockResolvedValue({ pgridid: "other-grid-id" });
    result = await loadLayoutSetting("grid-01", [], originalOption as any);
    expect(result).toBe(originalOption);
  });

  it("DB에 저장된 속성들이 원본 ColModel에 성공적으로 덮어씌워지고, clsHead 속성은 명시적으로 제거된다", async () => {
    // Given: API 결과가 width 속성과 제거되어야 할 clsHead를 포함하도록 설정
    mockApi.mockResolvedValue({
      pgridid: "grid-01",
      colmset: JSON.stringify([
        { dataIndx: "colA", width: 500, clsHead: "db-class-danger" },
      ]),
    });
    const inputColModel = [{ dataIndx: "colA", width: 100, title: "제목" }];

    // When: 함수 실행
    const result = await loadLayoutSetting(
      "grid-01",
      inputColModel as any,
      {} as any,
    );

    // Then: ColModel 병합 로직 검증
    expect(result.colModel[0].width).toBe(500); // 값이 덮어씌워짐
    expect(result.colModel[0].title).toBe("제목"); // 기존 값 보존
    expect(result.colModel[0].clsHead).toBeUndefined(); // delete 로직 정상 작동
  });

  it("DB에 저장된 배열 순서와 동일하게 최종 ColModel의 렌더링 인덱스가 재정렬되어야 한다", async () => {
    // Given: A-B-C 순서의 입력값을 C-A-B 형태의 DB 순서로 덮어쓰도록 설정
    mockApi.mockResolvedValue({
      pgridid: "grid-01",
      colmset: JSON.stringify([
        { dataIndx: "C" },
        { dataIndx: "A" },
        { dataIndx: "B" },
      ]),
    });
    const inputColModel = [
      { dataIndx: "A" },
      { dataIndx: "B" },
      { dataIndx: "C" },
    ];

    // When: 함수 실행
    const result = await loadLayoutSetting(
      "grid-01",
      inputColModel as any,
      {} as any,
    );

    // Then: 정렬 정합성 확인
    expect(result.colModel[0].dataIndx).toBe("C");
    expect(result.colModel[1].dataIndx).toBe("A");
    expect(result.colModel[2].dataIndx).toBe("B");
  });

  it("Grid 전체 옵션 설정이 정상적으로 주입되며, groupModel 객체의 on 속성도 안전하게 병합된다", async () => {
    // Given: gridset 옵션 내부에 일반 속성(height)과 특수 속성(groupModel)을 설정
    mockApi.mockResolvedValue({
      pgridid: "grid-01",
      gridset: JSON.stringify({
        height: 900,
        groupModel: { on: true },
      }),
    });
    const baseOption = {
      height: 300,
      groupModel: { on: false, title: "그룹" },
    };

    // When: 함수 실행
    const result = await loadLayoutSetting("grid-01", [], baseOption as any);

    // Then: 최종 리턴 옵션 검증
    expect(result.height).toBe(900); // 기존 높이가 덮어씌워짐
    expect(result.groupModel?.on).toBe(true); // groupModel.on 플래그가 true로 전환됨
  });
});
