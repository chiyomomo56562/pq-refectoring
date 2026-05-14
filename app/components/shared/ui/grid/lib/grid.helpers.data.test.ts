import { describe, it, expect } from "vitest";
import { ref } from "vue";
import {
  getIsEditing,
  editableNewOnly,
  checkUniqueOnlyThisColumn,
  convertTheChangesToBodyParams,
} from "./grid.helpers.data";

describe("grid.helpers.data 순수 로직 단위 테스트", () => {
  describe("1. getIsEditing 판별기 검증", () => {
    it("GH_01: updateList 내 변경점이 단순 state 속성 하나인 경우, false(수정 없음)를 리턴한다", () => {
      const mockGrid = ref({
        getChanges: () => ({
          addList: [],
          updateList: [{ state: true }],
          oldList: [{ state: false }],
          deleteList: [],
        }),
      });

      const isModifying = getIsEditing(mockGrid);
      expect(isModifying).toBe(false);
    });

    it("GH_02: addList에 항목이 존재하여 실질적 데이터 입력이 발생한 경우, true를 반환한다", () => {
      const mockGrid = ref({
        getChanges: () => ({
          addList: [{ name: "Dummy", state: true }],
          updateList: [],
          oldList: [],
          deleteList: [],
        }),
      });

      const isModifying = getIsEditing(mockGrid);
      expect(isModifying).toBe(true);
    });

    it("GH_03: gridBoxSet 하위 컴포넌트 그리드 중 단 한곳이라도 수정이 있다면 취합된 결과로 true를 반환한다", () => {
      const gridBoxSet = ref({
        head: {
          getChanges: () => ({
            addList: [],
            updateList: [],
            oldList: [],
            deleteList: [],
          }),
        },
        item: {
          getChanges: () => ({
            addList: [{ state: true }],
            updateList: [],
            oldList: [],
            deleteList: [],
          }),
        },
      });

      const isModifying = getIsEditing(null, gridBoxSet);
      expect(isModifying).toBe(true);
    });
  });

  describe("2. editableNewOnly 신규행 검증", () => {
    it("GH_04: 데이터 객체에 rowkey 키가 존재하지 않을 때에만 true를 응답해 편집을 허용한다", () => {
      const noKeyRow = { rowData: { code: "TEMP" } };
      const hasKeyRow = { rowData: { rowkey: "EXISTS", code: "FINAL" } };

      expect(editableNewOnly(noKeyRow as any)).toBe(true);
      expect(editableNewOnly(hasKeyRow as any)).toBe(false);
    });
  });

  describe("3. checkUniqueOnlyThisColumn 중복 판별 검증", () => {
    it("GH_05: 타겟 배열(pdata) 내 동일한 인덱스 값이 이미 발견될 경우 즉각 중복(false) 판정을 내린다", () => {
      const context = {
        pdata: [
          { pq_ri: 0, id: "100" },
          { pq_ri: 1, id: "200" },
        ],
      };

      const currentUi = {
        value: "100", // 200번 행에서 100으로 수정 시도 가정
        column: { dataIndx: "id" },
        rowData: { pq_ri: 1 },
      };

      // Function.prototype.call 을 통해 this 컨텍스트 바인딩 시뮬레이션
      const isUnique = checkUniqueOnlyThisColumn.call(context, currentUi);
      expect(isUnique).toBe(false); // 0번 행 값과 중복되어 false

      const nonDupUi = {
        value: "300",
        column: { dataIndx: "id" },
        rowData: { pq_ri: 1 },
      };
      const isUniqueTrue = checkUniqueOnlyThisColumn.call(context, nonDupUi);
      expect(isUniqueTrue).toBe(true); // 중복되지 않아 true
    });
  });

  describe("4. convertTheChangesToBodyParams 페이로드 가공 검증", () => {
    it("GH_06: 그리드 트랜잭션 결과가 insert, update, delete 속성을 가진 표준 API 바디 형태로 파싱된다", () => {
      const mockGrid = ref({
        colModel: [],
        getChanges: () => ({
          addList: [{ val: "add", state: true }],
          updateList: [{ val: "upd", state: true }],
          deleteList: [{ val: "del" }],
          oldList: [],
        }),
      });

      const result = convertTheChangesToBodyParams(mockGrid);

      expect(result.insert).toHaveLength(1);
      expect(result.update).toHaveLength(1);
      expect(result.delete).toHaveLength(1);
      expect(result.insert[0].val).toBe("add");
    });

    it("GH_07: Key로 지정된 컬럼 데이터 변경 감지 시, previous value를 beforePrefix 형태로 주입 백업한다", () => {
      const mockGrid = ref({
        colModel: [{ dataIndx: "itemNo", isKey: true }],
        getChanges: () => ({
          addList: [],
          updateList: [{ itemNo: "A-New", state: true }],
          oldList: [{ itemNo: "A-Old" }],
          deleteList: [],
        }),
      });

      const result = convertTheChangesToBodyParams(mockGrid);

      // itemNo -> beforeItemNo 대문자화 변환 규칙 동작 확인
      expect(result.update[0].beforeItemNo).toBe("A-Old");
      expect(result.update[0].itemNo).toBe("A-New");
    });
  });
});
