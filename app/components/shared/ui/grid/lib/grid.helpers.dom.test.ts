import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import {
  whenChange,
  resetGridOf,
  changeGridMessageOfnoRow,
  changeHeaderRowCls,
} from "./grid.helpers.dom";

describe("grid.helpers.dom 상호작용 유틸리티 단위 테스트", () => {
  // 비동기 플러시 유틸리티 (whenChange 내부의 async loop 실행 보장)
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("HD_01: whenChange() 추가 이벤트 시 컬럼 init 속성이 updateRow로 주입된다", async () => {
    const mockUpdateRow = vi.fn();
    const selfMock = {
      colModel: [{ dataIndx: "fixedField", init: "InitialValue" }],
      updateRow: mockUpdateRow,
    };

    const uiMock = {
      source: "user",
      updateList: [],
      addList: [
        {
          newRow: { pq_ri: 7, state: true },
          rowData: {},
        },
      ],
    };

    whenChange({}, uiMock, selfMock);
    await flushPromises(); // 내부 async scope 플러시

    expect(mockUpdateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        rowIndx: 7,
        newRow: { fixedField: "InitialValue" },
      }),
    );
  });

  it("HD_02: whenChange() 수정 이벤트 시 onChangeMake 연산 로직에 따라 연동 필드가 자동 수정된다", async () => {
    const selfMock = {
      colModel: [
        {
          dataIndx: "qty",
          onChangeMake: [
            {
              target: "total",
              value: ({ newRow }: any) => newRow.qty * 500,
            },
          ],
        },
      ],
    };

    // logic sets result directly to newRow[target]
    const myNewRow = { qty: 3, pq_ri: 1 };
    const uiMock = {
      source: "user",
      updateList: [
        {
          newRow: myNewRow,
          rowData: {},
        },
      ],
      addList: [],
    };

    whenChange({}, uiMock, selfMock);
    await flushPromises();

    // qty(3) * 500 => 1500 자동 반영 확인
    expect((myNewRow as any).total).toBe(1500);
  });

  it("HD_03: whenChange() 에 전달된 row에 state 속성이 없으면 강제로 state=true를 삽입한다", async () => {
    const selfMock = {
      colModel: [{ dataIndx: "state" }],
    };
    const freshRow = { val: 1 }; // no state property
    const uiMock = {
      source: "user",
      updateList: [{ newRow: freshRow }],
      addList: [],
    };

    whenChange({}, uiMock, selfMock);
    await flushPromises();

    expect((freshRow as any).state).toBe(true);
  });

  it("HD_04: resetGridOf() 실행 시 데이터모델 교체와 뷰 갱신 API가 연속으로 호출된다", () => {
    const innerGrid = {
      option: vi.fn(),
      refreshDataAndView: vi.fn(),
    };
    const gridRef = ref(innerGrid);
    const testPayload = [{ rowkey: "R1", name: "A" }];

    resetGridOf(gridRef, testPayload);

    expect(innerGrid.option).toHaveBeenCalledWith("dataModel", {
      data: testPayload,
      recIndx: "rowkey",
    });
    expect(innerGrid.refreshDataAndView).toHaveBeenCalledTimes(1);
  });

  it("HD_05: changeGridMessageOfnoRow() 는 jQuery 선택자를 통해 돔 텍스트 조작을 시도한다", () => {
    const mockText = vi.fn();
    const mockFind = vi.fn().mockReturnValue({ text: mockText });

    const gridRef = {
      value: {
        $cont: {
          find: mockFind,
        },
      },
    };

    changeGridMessageOfnoRow(gridRef, "빈 데이터 안내문구");

    expect(mockFind).toHaveBeenCalledWith(".pq-grid-norows");
    expect(mockText).toHaveBeenCalledWith("빈 데이터 안내문구");
  });

  it("HD_06: changeHeaderRowCls() 는 기존 활성화 클래스를 모두 회수한 뒤 대상 행만 하이라이트한다", () => {
    const mockRemove = vi.fn();
    const mockAdd = vi.fn();
    const mockQuery = vi.fn().mockReturnValue([{ rowIndx: 99 }]); // 기존 타겟

    const parentGrid = {
      getRowsByClass: mockQuery,
      removeClass: mockRemove,
      addClass: mockAdd,
    };

    changeHeaderRowCls(parentGrid, 5); // 5번 신규 활성화

    // 1. 기존 활성 99번 제거
    expect(mockRemove).toHaveBeenCalledWith(
      expect.objectContaining({ rowIndx: 99 }),
    );
    // 2. 신규 5번 부여
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ rowIndx: 5 }),
    );
  });
});
