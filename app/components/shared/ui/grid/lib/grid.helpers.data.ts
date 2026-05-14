import type { Ref } from "vue";
import { unref } from "vue";
import type pq from "pqgrid";
import type { GridBoxSet, GridChanges } from "../model/types/grid.types";

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

  // multi grid 지원
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
 * 컬럼의 데이터가 유일한 데이터인지 확인
 */
export function checkUniqueOnlyThisColumn(ui: any) {
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
 * 컴포넌트 공동 post 기능에 사용할 res 생성
 */
export function convertTheChangesToBodyParams(
  theGrid: any,
  gridBoxSet?: Ref<GridBoxSet>,
) {
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
          u[beforeColumnName] = oldVal;
        });
      });
    }

    return res;
  };

  let res: any = {};

  if (gridBoxSet?.value && Object.keys(gridBoxSet.value)?.length) {
    Object.entries(gridBoxSet.value).forEach((kv) => {
      res[kv[0]] = changesToRes(kv[1]);
    });
  } else {
    res = changesToRes(theGrid);
  }
  return res;
}
