import type { Ref } from "vue";
import { unref } from "vue";
import type pq from "pqgrid";
import type {
  GridBoxSet,
  GridChanges,
  ColModel,
} from "../model/types/grid.types";
import { ClassHeadFromEditable } from "./grid.constants";

/*
 * grid row 중 실질적으로 editing이 있는지 확인 : true/false
 */
export function getIsEditing(
  theGrid: any,
  gridBoxSet?: Ref<GridBoxSet>,
  onlySelectedState = false,
) {
  // 변경한 목록이 있는지 확인하는 함수
  const thisGridIsEditing = (_theGrid: any) => {
    // 변경한 목록을 모두 가져옴
    const theChanges = unref(_theGrid)?.getChanges?.({
      format: "byVal",
      all: true,
    }) as GridChanges;
    if (!theChanges) return false;

    // 변경하기 전 목록과 비교해서 변경내역이 state 하나인것만 있는지 확인
    const onlyStateChanges = theChanges.oldList.filter((oldRow) => {
      const keys = Object.keys(oldRow);
      return keys.length === 1 && keys.includes("state");
    });

    // 변경한 값이 state하나인 경우 false 반환
    if (
      !onlySelectedState &&
      theChanges.updateList.length > 0 &&
      onlyStateChanges.length > 0 &&
      onlyStateChanges.length === theChanges.updateList.length &&
      theChanges.addList.length === 0
    ) {
      return false;
    }

    // 아니라면 state가 true인 항목이 하나라도 있다면 true 반환
    return Object.values(theChanges).some(
      (list) =>
        Array.isArray(list) && list.filter((item) => item.state).length > 0,
    );
  };
  // thisGridIsEditing End

  // 뭐가 들어있을 진 모르겠지만 하여간 3개 있는 것 다 시도.
  if (gridBoxSet?.value && Object.keys(gridBoxSet.value)?.length) {
    const headEditing = gridBoxSet.value.head
      ? thisGridIsEditing(gridBoxSet.value.head)
      : false;
    const itemEditing = gridBoxSet.value.item
      ? thisGridIsEditing(gridBoxSet.value.item)
      : false;
    const subEditing = gridBoxSet.value.sub
      ? thisGridIsEditing(gridBoxSet.value.sub)
      : false;

    return headEditing || itemEditing || subEditing;
  } else {
    return thisGridIsEditing(theGrid);
  }
}

/**
 * rowkey가 존재하지 않는 경우에만 편집가능
 */
export function editableNewOnly(ui: pq.gridT.renderObj) {
  return !ui?.rowData?.rowkey;
}

/**
 *
 * 그리드의 'change' 이벤트는 해당 이벤트로 등록되어있음
 */
export function whenChange(event: any, ui: any, self: any, parentRow = {}) {
  if (ui.source === "rollback") return; // 초기화 이벤트에는 실행 X
  const colModels = self?.colModel || []; // colModel 배열 가져오기
  const atUpdateOrAdd = async (u: any, whenChangeType: "update" | "add") => {
    const targetRow = u.newRow;
    if (!targetRow) return; // 새로 입력되거나 추가된 데이터가 없으면 종료

    // state를 따로 체크하지 않았다면 true로 업데이트
    if (
      !Object.prototype.hasOwnProperty.call(targetRow, "state") &&
      colModels.find((c: any) => c.dataIndx === "state") // state를 찾아서 true로 설정
    ) {
      // self.updateRow({
      //   rowIndx: u.rowIndx,
      //   newRow: { state: true },
      // });
      u.newRow.state = true;
    }

    // 추가 시, 행 상태를 true로 설정
    if (whenChangeType === "add") {
      // targetRow.state = true;
      // 비동기 init 메서드 실행 및 처리
      const initResults = await Promise.all(
        // 각 컬럼의 초기값(dataIndx, value)을 포함한 프로미스배열
        colModels.map(async (c: any) => {
          if (c?.init) {
            // 각 컬럼의 init으로 설정한 값 반영
            if (typeof c.init === "function") {
              // 함수인경우 비동기 호출
              const value = await c.init({
                pqgridData: self,
                colModels,
                thisColModel: c,
                currentRow: u.rowData,
                newRow: targetRow,
                parentRow,
              });
              return { index: c.dataIndx, value: value };
            } else {
              if (
                ui.source === "paste" &&
                u.newRow[c.dataIndx] &&
                u.newRow[c.dataIndx] !== c.init
              ) {
                return null;
              }
              // c.init이 함수가 아닐 때 직접 할당
              return { index: c.dataIndx, value: c.init };
            }
          }
          return null;
        }),
      );

      // init 결과 반영
      initResults.forEach((result) => {
        if (result && result.value != null) {
          // u.newRow[result.index] = result.value;
          self.updateRow({
            rowIndx: u.newRow.pq_ri,
            newRow: {
              [result.index]: result.value,
            },
            checkEditable: false,
          });
        }
      });
      // self.refreshView();

      // 모든 컬럼 모델에 대해 반복
      colModels.forEach((c: any) => {
        if (!c) return;
        if (
          // onChangeMake 로직이 있고, 해당 컬럼에 대한 값이 정의되어 있는 경우 실행
          c.onChangeMake &&
          targetRow[c.dataIndx] !== undefined &&
          targetRow[c.dataIndx] !== null
        ) {
          c.onChangeMake.forEach((ocm: any) => {
            // toValue 계산, 함수 또는 고정 값
            const toValue =
              typeof ocm.value != "function"
                ? ocm.value
                : ocm.value({
                    pqgridData: self,
                    colModels,
                    thisColModel: c,
                    currentRow: u.rowData,
                    newRow: targetRow,
                    parentRow,
                  });

            // 추가 상황에서 결과를 행에 설정
            self?.updateRow?.({
              rowIndx: u.newRow.pq_ri,
              newRow: {
                [ocm.target]: toValue,
              },
              checkEditable: false,
            });
            // u.newRow[ocm.target] = toValue;
            // 업데이트 상황에서 해당 컬럼을 업데이트
            // const column = colModels.find(
            //   (obj: any) => obj["dataIndx"] === ocm.target,
            // );
            // self?.updateRow?.({
            //   rowIndx: u.rowIndx,
            //   newRow: {
            //     [ocm.target]: toValue,
            //   },
            //   checkEditable: false,
            // });
            // 원래의 유효성 검사 배열 복원
          });
        }
      });
    } else {
      // add 벗어나서 onChangeMake 작동
      // 모든 컬럼 모델에 대해 반복
      colModels.forEach((c: any) => {
        if (!c) return;
        if (
          // onChangeMake 로직이 있고, 해당 컬럼에 대한 값이 정의되어 있는 경우 실행
          c.onChangeMake &&
          targetRow[c.dataIndx] !== undefined // !== null 조건 제외
        ) {
          c.onChangeMake.forEach((ocm: any) => {
            // toValue 계산, 함수 또는 고정 값
            const toValue =
              typeof ocm.value != "function"
                ? ocm.value
                : ocm.value({
                    pqgridData: self,
                    colModels,
                    thisColModel: c,
                    currentRow: u.rowData,
                    newRow: targetRow,
                    parentRow,
                  });

            // 추가 상황에서 결과를 행에 설정

            // 업데이트 상황에서 해당 컬럼을 업데이트
            // const column = colModels.find(
            //   (obj: any) => obj["dataIndx"] === ocm.target,
            // );
            // self?.updateRow?.({
            //   rowIndx: u.rowIndx,
            //   newRow: {
            //     [ocm.target]: toValue,
            //   },
            //   checkEditable: false,
            // });
            u.newRow[ocm.target] = toValue;
          });
        }
      });
    }

    // 화면 갱신
    // self.refreshView(); // 성능이슈로 주석처리
  };

  // 모든 업데이트 및 추가 이벤트에 대한 처리
  ui.updateList.forEach((u: any) => atUpdateOrAdd(u, "update"));
  ui.addList.forEach((u: any) => atUpdateOrAdd(u, "add"));
}

/**
 * 컬럼의 데이터가 유일한 데이터인지 확인
 */
export function checkUniqueOnlyThisColumn(ui: any) {
  // : pq.gridT.renderObj) {
  const theData = ui?.value || "";
  const dataIndx = ui?.column?.dataIndx || "";
  // @ts-expect-error
  if (!this) return;
  // @ts-expect-error
  const pdata: any[] = this?.pdata || [];
  return pdata.find(
    (p) => p?.pq_ri !== ui?.rowData?.pq_ri && p?.[dataIndx] == theData,
  )
    ? false
    : true;
}

/**
 * 조회한 데이터 그리드에 세팅
 * for Sub / Header grids
 * @param theGrid
 * @param anyData
 */
export function resetGridOf(theGrid: any, anyData: any[]) {
  unref(theGrid)?.option?.("dataModel", {
    data: anyData,
    recIndx: "rowkey",
  });
  theGrid.value?.refreshDataAndView?.();
}

/**
 * 컴포넌트 공동 post 기능에 사용할 res 생성
 */
export function convertTheChangesToBodyParams(
  theGrid: any,
  gridBoxSet?: Ref<GridBoxSet>,
) {
  // 공통화
  const changesToRes = (_theGrid: any) => {
    const theChanges = unref(_theGrid)?.getChanges?.({
      format: "byVal",
    }) as GridChanges;

    const res = {
      insert: theChanges.addList.filter((a) => a.state),
      update: theChanges.updateList.filter((u) => u.state),
      delete: theChanges.deleteList,
    };

    // before Columns 추가
    const keyCols = unref(_theGrid).colModel.filter((c: any) => c.isKey);
    if (keyCols?.length) {
      res.update.forEach((u: any, uidx: number) => {
        keyCols.forEach((c: any) => {
          const colName = c.dataIndx + "";
          const beforeColumnName =
            "before" + colName.charAt(0).toUpperCase() + colName.slice(1);
          const oldVal = theChanges?.oldList?.[uidx]?.[colName];
          u[beforeColumnName] = oldVal; // ?? u[colName];
        });
      });
    }

    return res;
  };

  let res: any = {}; // changesToRes(theGrid);

  // 뭐가 들어있을 진 모르겠지만 하여간 3개 있는 것 다 시도.
  // multi grid인 경우 head, item 구분
  if (gridBoxSet?.value && Object.keys(gridBoxSet.value)?.length) {
    Object.entries(gridBoxSet.value).forEach((kv) => {
      res[kv[0]] = changesToRes(kv[1]);
    });
  } else {
    res = changesToRes(theGrid);
  }
  return res;
}

/**
 *행이 없을때 메시지 수정
 */
export function changeGridMessageOfnoRow(theGrid: any, targetMsg: string) {
  if (!theGrid?.value?.$cont) return;

  theGrid.value.$cont.find?.(".pq-grid-norows")?.text?.(targetMsg); // || t('noRows'))
}

/**
 * editable 여부에 따라 컬럼 헤더 색상 변경
 */
export function changeHeaderRowCls(theParentGrid: any, rowIndx: number = 0) {
  if (!theParentGrid) return;
  const cls = ClassHeadFromEditable["row-highlight"];
  // 우선 전부 cls 붙은거 리셋
  unref(theParentGrid)
    .getRowsByClass({ cls })
    .forEach((res: any) =>
      unref(theParentGrid).removeClass({ rowIndx: res.rowIndx, cls }),
    );
  unref(theParentGrid).addClass({ rowIndx, cls });
}
