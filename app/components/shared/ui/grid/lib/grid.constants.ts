import type pq from "pqgrid";
import { initRightClickMenu } from "./grid.actions";

/**
 * 그리드 생성시 기본으로 세팅할 option
 */
export const DefaultOptions: pq.gridT.options = Object.freeze({
  // ### 이하 options https://paramquery.com/pro/api#option-animModel
  locale: "kr",
  warning: { icon: "", style: "", cls: "" }, // 경고 메세지 설정
  selectionModel: { type: "cell", mode: "block" },
  wrap: false, // true 인 경우 셀의 텍스트가 다음 줄로 줄 바꿈되고 그렇지 않으면 넘친 텍스트가 숨겨지고 연속 기호 ...가 끝에 표시됩니다.
  collapsible: { on: false, toggle: false },
  rowHtHead: 36, // 그리드 헤더의 높이
  rowHt: 32, // 그리드의 모든 행의 높이를 일정하게 설정합니다.
  trackModel: { on: true }, // 그리드 인라인 추가, 업데이트 및 삭제 작업에 대한 추적 속성을 설정
  dataModel: { recIndx: "rowkey" },
  postRenderInterval: -1, // render:는 정적처리 //posrRender는 동적처리 기능임 -1은 동기 0보다 크거나같으면 비동기처리
  hoverMode: "row",
  showTitle: false,
  groupModel: {
    // 그룹화 설정
    on: false, // 그룹화 활성화 여부
    collapsed: [false, true], // 그룹화된 항목 축소 여부
    summaryInTitleRow: "all", // 그룹화된 항목의 요약정보를 표시할 위치
    merge: true, // 그룹화된 항목의 셀 병합 여부
    showSummary: [true, true], // 그룹화된 항목의 요약 정보 표시 여부
    grandSummary: true, // 모든 그룹화된 항목의 총 요약 정보 표시 여부,
    fixCols: false,
    header: false,
  },
  toolbar: { cls: "pq-toolbar-search", items: [] },
  contextMenu: {
    on: true,
    headItems: initRightClickMenu as any, // header context menu items.
    cellItems: initRightClickMenu as any, // body context menu items
  },
  numberCell: {
    width: 40,
    title: "",
    resizable: false,
    menuUI: { tabs: ["hideCols", "export"] },
    minWidth: 40,
    show: true,
  },
  resizable: true,
  attr: { "aria-hidden": "true" },
});

/**
 * editable 여부에 따라서 변경되는 그리드 헤더의 배경색상 클래스
 * 추후 수정될 예정
 */
export const ClassHeadFromEditable = {
  true: "bg-[#FFF9E6]", // 수정가능 연한 노란색으로 변경
  false: "bg-[#ECF1F9]", // 수정불가능
  nonEmpty: "bg-[#EFFCF2]", // 필수
  "new-only": "bg-[#EFFCF2]", // 첫등록때만 입력가능
  "row-highlight": "bg-[#ECF1F9]", // 선택됨
};

/*
 * 검색영역의 크기 조절
 */
export const SearchBarSizes = {
  default: { container: 12, label: 4, wrapper: 12 },
  xs: { container: 12, label: 4, wrapper: 12 },
  sm: { container: 12, label: 4, wrapper: 12 },
  md: { container: 6, label: 4, wrapper: 12 },
  lg: { container: 4, label: 4, wrapper: 12 },
  xl: { container: 4, label: 4, wrapper: 12 },
};
