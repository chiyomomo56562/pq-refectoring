// @ts-nocheck
import type { ColModel } from "../model/types/grid.types";

/**
 * Grid 데이터에 특정 텍스트가 발견되면 해당 부분을 하이라이트 표시하는 function
 */
export function findRender(ui: any) {
  if (
    ui.cellData !== null &&
    ui.cellData !== undefined &&
    ui.cellData !== "" &&
    ui.dataIndx !== "state" &&
    this.options.findRules?.length > 0 &&
    ui.column.type !== "checkbox" &&
    ui.column.dataType !== "bool"
  ) {
    const findRules = this.options.findRules || [];
    const valType = typeof ui.cellData;
    let val = ui.formatVal ? ui.formatVal.toString() : ui.cellData.toString();
    if (typeof ui.column.format === "function") {
      val = ui.column.format(val);
    }
    const valUpper = val.toUpperCase();
    const col = ui.dataIndx;
    let indx = -1;

    for (const findRule of findRules) {
      const txt = findRule.value.toUpperCase();
      indx = valUpper.indexOf(txt);
      if (col === findRule.dataIndx) {
        if (indx >= 0) {
          const txt1 = val.substring(0, indx);
          const txt2 = val.substring(indx, indx + txt.length);
          const txt3 = val.substring(indx + txt.length);
          return (
            txt1 +
            "<span style='background:yellow;color:#333;'>" +
            txt2 +
            "</span>" +
            txt3
          );
        }
      }
    }
    return valType === "string" ? val : ui.cellData;
  }
}

/**
 * recIndx로 설정될 rowkey를 생성하는 function
 */
export function getRowKey(
  rowData: any,
  colModels: Array<pq.gridT.column & ColModel>,
) {
  return colModels
    .map((c) => {
      const dataIndx = c?.dataIndx || "";
      return rowData[dataIndx];
    })
    .join(",,");
}
