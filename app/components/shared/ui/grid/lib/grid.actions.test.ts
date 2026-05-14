import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import {
  exportData,
  initToolbarItems,
  initRightClickMenu,
} from "./grid.actions";

// Nuxt Composables 전역 모킹 (top-level 호이스트 요구됨)
mockNuxtImport("useRoute", () => {
  return () => ({
    meta: { title: "마스터페이지" },
  });
});

// 런타임에서 유동적으로 주입될 수 있게 상위 스코프 레퍼런스 생성
const dynamicApiSpy = vi.fn().mockResolvedValue(1);

mockNuxtImport("useNuxtApp", () => {
  return () => ({
    $i18n: { t: (k: string) => k },
    $api: dynamicApiSpy,
  });
});

describe("grid.actions.ts 상호작용 로직 단위 테스트", () => {
  let createElementSpy: any;
  let appendSpy: any;
  let removeSpy: any;

  beforeEach(() => {
    // 브라우저 API 전역 모킹
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mocked-download-url"),
      revokeObjectURL: vi.fn(),
    });

    // DOM 조작 스파이 준비
    createElementSpy = vi.spyOn(document, "createElement");
    appendSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => ({} as any));
    removeSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => ({} as any));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. exportData (다운로드 액션) 검증", () => {
    it("GA_01, GA_02: 동적 <a> 태그 생성 및 Route 제목을 이용한 표준 명명 파일 다운로드가 격발된다", () => {
      const linkMock = {
        href: "",
        download: "",
        click: vi.fn(),
      };
      createElementSpy.mockReturnValue(linkMock as any);

      const fakeGrid = {
        exportData: vi.fn().mockReturnValue("dummy_csv_data"),
      };

      // apply user context function binding
      exportData.call(fakeGrid, "csv");

      // 1. 파일명 규격 확인 (logistics_{제목}.csv)
      expect(linkMock.download).toBe("logistics_마스터페이지.csv");
      // 2. Object URL 주입 확인
      expect(linkMock.href).toBe("blob:mocked-download-url");
      // 3. 클릭 이벤트 시뮬레이션 격발 확인
      expect(linkMock.click).toHaveBeenCalledTimes(1);
    });

    it("GA_03: xlsx 포맷 추출 시, 엑셀 폰트 충돌을 막기 위해 각 셀 스타일의 fontSize를 말소하는 전처리가 가동된다", () => {
      let capturedOptions: any = null;
      const fakeGrid = {
        exportData: vi.fn().mockImplementation((opts) => {
          capturedOptions = opts;
          return new Blob([]);
        }),
      };
      createElementSpy.mockReturnValue({ click: vi.fn() } as any);

      exportData.call(fakeGrid, "xlsx");

      // 렌더링 옵션 플래그 확인
      expect(capturedOptions.render).toBe(true);

      // eachCol 전처리 호출 시 fontSize 속성 삭제 검증
      const dummyCol = { dataIndx: "name", fontSize: "14px" };
      capturedOptions.eachCol(dummyCol);
      expect(dummyCol.fontSize).toBeUndefined();

      // eachRowHead 전처리 호출 시 셀 속성 삭제 검증
      const dummyRow = { cells: [{ value: "A", fontSize: "10px" }] };
      capturedOptions.eachRowHead(dummyRow);
      expect(dummyRow.cells[0].fontSize).toBeUndefined();
    });
  });

  describe("2. initToolbarItems (툴바 명세) 검증", () => {
    it("GA_04: props.delete가 false로 전달되면 삭제 버튼에 'display: none' 스타일이 적용된다", () => {
      const items = initToolbarItems({ delete: false }, { value: {} });

      // i-humbleicons-minus 나 bt.delete 레이블 포함 여부로 탐색
      const deleteBtn = items.find((i) => i.label?.includes("bt.delete"));

      expect(deleteBtn).toBeDefined();
      expect(deleteBtn!.style).toContain("display: none");
    });

    it("GA_05: 리셋 버튼의 listener 클릭 시, 컨펌 승인 후 그리드의 rollback 및 히스토리 리셋 API가 순차 발동된다", () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(true)); // 승인 가정

      const items = initToolbarItems({ reset: true }, { value: {} });
      const resetBtn = items.find((i) => i.label?.includes("bt.reset"));

      const fakeGrid = {
        rollback: vi.fn(),
        history: vi.fn(),
      };

      // listener 실행
      resetBtn!.listener.call(fakeGrid);

      expect(fakeGrid.rollback).toHaveBeenCalledTimes(1);
      expect(fakeGrid.history).toHaveBeenCalledWith({ method: "reset" });
    });

    it("GA_06: findColumn 셀렉트 박스의 option 생성기가 colModel로부터 숨겨진 행과 state 행을 배제하여 완성한다", () => {
      const items = initToolbarItems({}, { value: {} });
      const findCol = items.find((i) => i.cls === "findColumn");

      // function execution test
      const dummyUi = {
        colModel: [
          { dataIndx: "state", title: "상태", hidden: false }, // 무시 대상
          { dataIndx: "colA", title: "컬럼A", hidden: false }, // 포함 대상
          { dataIndx: "colB", title: "컬럼B", hidden: true }, // 무시 대상
        ],
      };

      const resultOpts = findCol!.options(dummyUi);

      // result[0] -> allFields, result[1] -> colA
      expect(resultOpts).toHaveLength(2);
      expect(resultOpts[1]).toHaveProperty("colA", "컬럼A");
    });
  });

  describe("3. initRightClickMenu (우클릭 메뉴) 검증", () => {
    it("GA_07: 반환되는 메뉴 구조에 공통 액션인 Copy(복사), Paste(붙여넣기) 옵션이 반드시 포함된다", () => {
      const fakeGrid = {
        $grid_center: { prevObject: [{ id: "GRID1" }] },
        option: vi.fn().mockReturnValue(0), // option mock 추가하여 freeze check 회피
      };

      const menu = initRightClickMenu.call(fakeGrid, {}, {});

      const copyObj = menu.find((m: any) => m.name === "Copy");
      const pasteObj = menu.find((m: any) => m.name === "Paste");

      expect(copyObj).toBeDefined();
      expect(pasteObj).toBeDefined();
    });

    it("GA_08: 레이아웃 저장 메뉴 실행 시, 그리드 옵션을 취합하여 Nuxt $api에 POST 요청을 전송한다", async () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(true)); // confirm 승인
      dynamicApiSpy.mockClear(); // 이전에 호출된 기록 초기화

      const fakeGrid = {
        $grid_center: { prevObject: [{ id: "TEST_GRID_001" }] },
        option: vi.fn().mockReturnValue("dummy_val"),
        colModel: [{ dataIndx: "field1", hidden: false, title: "필드" }],
      };

      const menu = initRightClickMenu.call(fakeGrid, {}, {});
      const saveMenu = menu.find(
        (m: any) => m.name === "grid.layout.layoutSave",
      );

      // action 실행 (비동기)
      await saveMenu.action.call(fakeGrid);

      // dynamicApiSpy 가 정확한 주소 및 post 메서드로 콜되었는지 확인
      expect(dynamicApiSpy).toHaveBeenCalledWith(
        "/user/grid-layout",
        expect.objectContaining({
          method: "post",
        }),
      );
    });
  });
});
