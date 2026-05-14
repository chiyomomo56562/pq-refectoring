import { unref } from "vue";
import { ClassHeadFromEditable } from "./grid.constants";

/**
 * 그리드의 'change' 이벤트 리스너
 */
export function whenChange(event: any, ui: any, self: any, parentRow = {}) {
  if (ui.source === "rollback") return;
  const colModels = self?.colModel || [];
  const atUpdateOrAdd = async (u: any, whenChangeType: "update" | "add") => {
    const targetRow = u.newRow;
    if (!targetRow) return;

    if (
      !Object.prototype.hasOwnProperty.call(targetRow, "state") &&
      colModels.find((c: any) => c.dataIndx === "state")
    ) {
      u.newRow.state = true;
    }

    if (whenChangeType === "add") {
      const initResults = await Promise.all(
        colModels.map(async (c: any) => {
          if (c?.init) {
            if (typeof c.init === "function") {
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
              return { index: c.dataIndx, value: c.init };
            }
          }
          return null;
        }),
      );

      initResults.forEach((result) => {
        if (result && result.value != null) {
          self.updateRow({
            rowIndx: u.newRow.pq_ri,
            newRow: {
              [result.index]: result.value,
            },
            checkEditable: false,
          });
        }
      });

      colModels.forEach((c: any) => {
        if (!c) return;
        if (
          c.onChangeMake &&
          targetRow[c.dataIndx] !== undefined &&
          targetRow[c.dataIndx] !== null
        ) {
          c.onChangeMake.forEach((ocm: any) => {
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

            self?.updateRow?.({
              rowIndx: u.newRow.pq_ri,
              newRow: {
                [ocm.target]: toValue,
              },
              checkEditable: false,
            });
          });
        }
      });
    } else {
      colModels.forEach((c: any) => {
        if (!c) return;
        if (
          c.onChangeMake &&
          targetRow[c.dataIndx] !== undefined
        ) {
          c.onChangeMake.forEach((ocm: any) => {
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
            u.newRow[ocm.target] = toValue;
          });
        }
      });
    }
  };

  ui.updateList.forEach((u: any) => atUpdateOrAdd(u, "update"));
  ui.addList.forEach((u: any) => atUpdateOrAdd(u, "add"));
}

/**
 * 조회한 데이터 그리드에 세팅
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
 * 행이 없을 때 표시되는 메시지 영역 수정 (jQuery 기반)
 */
export function changeGridMessageOfnoRow(theGrid: any, targetMsg: string) {
  if (!theGrid?.value?.$cont) return;
  theGrid.value.$cont.find?.(".pq-grid-norows")?.text?.(targetMsg);
}

/**
 * 선택 행의 헤더 CSS 클래스 동적 토글
 */
export function changeHeaderRowCls(theParentGrid: any, rowIndx: number = 0) {
  if (!theParentGrid) return;
  const cls = ClassHeadFromEditable["row-highlight"];

  unref(theParentGrid)
    .getRowsByClass({ cls })
    .forEach((res: any) =>
      unref(theParentGrid).removeClass({ rowIndx: res.rowIndx, cls }),
    );
  unref(theParentGrid).addClass({ rowIndx, cls });
}
