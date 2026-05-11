// @ts-nocheck
import type { ToolbarItems, ColModel } from "./Grid.vue";
import { createApp, h, ref } from "vue";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import { ko } from "date-fns/locale";
import CustomSelectElement from "./CustomSelectElement.vue";
import vueform from "@vueform/vueform";
import dayjs from "dayjs/esm";

/**
 * Grid 데이터를 export 하는 function
 */
function exportData(format: string) {
  // 기본 옵션 설정
  const options: any = {
    format: format,
    skipHiddenCols: true, // 숨겨진 컬럼 제외
    skipHiddenRows: true, // 숨겨진 행 제외
  };

  const nowRoute = useRoute();

  options.eachCell = function (
    cell: any,
    ci: any,
    ri: any,
    column: any,
    rowData: any,
  ) {
    const htmlRegex = /<[^>]*>/g; // html 태그 검사
    if (htmlRegex.test(cell.value)) {
      if (typeof cell.value === "string" && cell.value.includes("▼"))
        // 셀렉트박스 컬럼이 빈값인 경우 기본으로 설정된 ▼ 제거
        cell.value = " ";
    }
  };

  // 엑셀로 받을시 폰트사이즈 문제로 인해 오류발생
  if (format === "xlsx") {
    options.render = true; // 렌더링 된 상태로 엑셀 생성
    // 엑셀에서 오류가 발생할 수 있는 스타일을 제거
    options.eachCol = function (col: any, ci: any, column: any) {
      delete col.fontSize;
    };
    options.eachRowHead = function (row: any) {
      row.cells.forEach((item: any) => {
        delete item.fontSize;
      });
    };
  }
  // 그리드의 데이터를 다양한 형식으로 내보내기 위한 기능 제공
  // let blob = this.exportData({ format });
  let blob = this.exportData(options);

  if (typeof blob === "string") {
    blob = new Blob([blob]);
  }
  //
  // WARN: 현재 file-saver관련 오류로 인해 직접 다운로드하는 방식으로 설정
  // saveAs(blob, "logistics_" + nowRoute.meta.title + "." + format);
  // Blob 데이터를 브라우저에서 접근 가능한 임시 URL로 생성
  const url = URL.createObjectURL(blob);
  // 다운로드를 위한 <a> 태그 생성
  const link = document.createElement("a");
  link.href = url;
  // 다운로드될 파일명 지정 (확장자는 format 기준)
  link.download = `logistics_${nowRoute.meta.title}.${format}`;
  // DOM에 추가 (일부 브라우저에서 필요)
  document.body.appendChild(link);
  // 강제로 클릭 이벤트 발생 → 다운로드 실행
  link.click();
  // 사용 끝난 <a> 태그 제거
  document.body.removeChild(link);
  // 생성했던 임시 URL 메모리 해제 (메모리 누수 방지)
  URL.revokeObjectURL(url);
}

/**
 * 이미 선택된 Index를 찾는 function
 */
function getSelectedIdx(focusRules: Array<object>, sel: any) {
  const current = sel?.address?.();
  if (current.length < 1) return -1;
  return focusRules.findIndex(
    (fd) => fd.rowIndx === current[0].r1 && fd.colIndx === current[0].c1,
  );
}

/**
 * Grid 데이터에 특정 텍스트가 발견되면 해당 부분을 하이라이트 표시하는 function
 */
export function findRender(ui) {
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
    // 숫자의 경우 포매팅된 숫자를 확인하기 위함(ex: 1000 -> 1,000으로 확인해야 함)
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
  // else {
  //   return ui.formatVal ? ui.formatVal.toString() : ui.cellData;
  // }
}

/**
 * recIndx로 설정될 rowkey를 생성하는 function
 */
export function getRowKey(
  rowData: any,
  colModels: Array<pq.gridT.column & ColModel>,
) {
  // 반드시 모든 columns 조합
  return colModels // .filter((c) => c?.dataIndx)
    .map((c) => {
      const dataIndx = c?.dataIndx || "";
      return rowData[dataIndx];
    })
    .join(",,");
}

/**
 * 그리드 toolbar내 검색을 위한 이벤트
 */
function findHandler() {
  const cls = "." + this.options.toolbar.cls;
  const toolbar = document.querySelector(cls) as HTMLElement;
  const value = (toolbar.querySelector(".findValue") as HTMLInputElement).value;
  const dataIndx = (toolbar.querySelector(".findColumn") as HTMLSelectElement)
    .value;
  // 검색조건 컬럼을 지정하지 않을 경우 모든 컬럼을 대상으로 검색하도록 설정
  if (dataIndx === "") {
    const obj = [];
    this.getColModel().map(function (column) {
      if (column.dataIndx === "state" || column.hidden === true) {
        // column.dataType === "integer"
        return;
      } else {
        obj.push({
          dataIndx: column.dataIndx,
          value: value,
          type: column.dataType,
        });
      }
    });
    this.options.findRules = obj;
  } else {
    this.options.findRules = [{ dataIndx: dataIndx, value: value, type: "" }];
  }
  this.refreshView();
}

/**
 * TODO 무슨? function
 */
function focusHandler() {
  const cls = "." + this.options.toolbar.cls;
  const toolbar = document.querySelector(cls) as HTMLElement;
  const findKeyword = (toolbar.querySelector(".findValue") as HTMLInputElement)
    .value;
  const dataIndx = (toolbar.querySelector(".findColumn") as HTMLSelectElement)
    .value;
  const findRules = this.options.findRules || [];
  // 입력한 값이 없으면 return
  if (!findKeyword) return;
  const gridData = this.getData?.();
  const colModel = this.getColModel?.();

  const focusData = [];
  const valueUpper = findKeyword.toUpperCase();
  // // 3. render 적용된 데이터 새 배열 생성
  const renderedData = gridData.map((rowData, rowIndx) => {
    const newRow: any = {};
    colModel.forEach((col, colIndx) => {
      const row = rowData[col.dataIndx];
      const editor = col?.editor;
      let options = editor?.options || [];
      if (typeof options == "function") {
        // @ts-expect-error
        options = editor._options;
      }

      if (options.length > 0) {
        const label = options?.find?.((o) => o[row])?.[row];
        newRow[col.dataIndx] = label;
      } else if (typeof col.format === "function") {
        newRow[col.dataIndx] = col.format(row);
      }
    });
    return { ...rowData, ...newRow };
  });
  for (const data of renderedData) {
    for (const findRule of findRules) {
      const dataVal = !data[findRule.dataIndx]
        ? ""
        : data[findRule.dataIndx].toString();
      const dataValUpper = dataVal?.toUpperCase();
      if (dataValUpper.indexOf(valueUpper) !== -1) {
        focusData.push({
          rowIndx: data.pq_ri,
          colIndx: this.getColIndx({ dataIndx: findRule.dataIndx }),
        });
      }
    }
  }

  if (focusData.length) {
    const sel = this.Selection();
    const selectedIdx = getSelectedIdx(focusData, sel);
    const nextIdx = selectedIdx < focusData.length - 1 ? selectedIdx + 1 : 0;
    if (selectedIdx < focusData.length) {
      this.setSelection({
        rowIndx: focusData[nextIdx].rowIndx,
        colIndx: focusData[nextIdx].colIndx,
      });
    }
  }
}

/**
 * grid 내의 버튼 : add reset delete 등
 */
export function initToolbarItems(tf?: ToolbarItems, parentRow: any) {
  const nuxtApp = useNuxtApp();
  const t = nuxtApp.$i18n.t;
  return [
    // ㄱ reset 활성화 여부 ㄱ
    {
      type: "button",
      // cls: "btn-sm btn-primary-border",
      style:
        (tf?.reset ?? true)
          ? "float:right; height: auto; margin-right: 0; "
          : "display: none;",
      // resetTb가 true면 float:right, 아니면 안보이게
      label:
        "<span class='i-tabler-rotate-clockwise'></span>" +
        "<span> " +
        t("bt.reset") +
        "<span> ",
      listener: function () {
        if (!confirm(t("grid.rollback"))) {
          return;
        }
        this.rollback(); // 이벤트 발생 : rollback 함수 실행 => 이전으로 되돌리기
        this.history({ method: "reset" }); // 이전 상태를 기록하고 이력 관리 수행(사용자가 실수로 데이터를 삭제하거나 변경한 경우, 이전 상태로 되돌릴 수 있다) => 취소/다시실행 기능에서 사용
      },
    },
    // ㄱ delete 활성화 여부 ㄱ
    {
      type: "button",
      // cls: "btn-sm btn-primary-border",
      style:
        (tf?.delete ?? false)
          ? "float: right; height: auto; margin-right: 0; "
          : "display: none;", // deleteTb true면 float: right; 아니면 안보이게
      // deleteTb true면 float:right, 아니면 안보이게
      //   cls: "pq-action-btn btn-white", // class이름 pq-action-btn
      label:
        "<span class='i-humbleicons-minus'></span>" +
        "<span> " +
        t("bt.delete") +
        " </span>",
      // label은 <i class='fa-regular fa-trash-can ui-icon-trash-f'></i> + TBdelete(없으면 Delete)
      listener:
        // tf?.deleteFunction ||
        function () {
          const checkList = this.Checkbox("state").getCheckedNodes();
          const rows = [];
          const noRowKeyList = checkList.filter((obj) => !obj.rowkey);
          const hasRowKeyList = checkList.filter((obj) => obj.rowkey);
          if (noRowKeyList.length >= 1 && hasRowKeyList.length === 0) {
            for (const check of noRowKeyList) {
              rows.push({ rowIndx: check.pq_ri });
            }

            if (confirm(t("confirm.rowDelete"))) {
              this.deleteRow({ rowList: rows });
              return;
            }
          } else if (hasRowKeyList.length >= 1) {
            alert(
              t("validations.hasRowkeyRow", {
                rowIndx: hasRowKeyList[0].pq_ri + 1,
              }),
            );
            return;
          } else {
            alert(t("choiceRowZero")); // 선택된 행이 없습니다.
            return;
          }
        }, //  deleteFun 이벤트 발생
    },
    // add 활성화 여부
    {
      type: "button",
      // cls: "btn-sm btn-primary-border", // WARN: BootStrap
      style:
        (tf?.add ?? true) ? "float: right; height: auto;" : "display: none;",
      //   cls: "pq-tool-btns pq-action-btn btn-white", // class이름 pq-tool-btns pq-action-btn
      label:
        "<span class='i-humbleicons-plus'></span>" +
        " <span>" +
        t("bt.add") +
        "</span> ",
      // label은 <i class='ui-button-icon-primary ui-icon ui-icon-add-f'></i> + TBadd(없으면 Add)
      listener: function () {
        // 아이템그리드에서 parentRow의 값이 없을경우 추가안되도록
        const colModel = this.option("colModel");
        for (let i = 0; i < colModel.length; i++) {
          if (
            colModel[i].isParentKey &&
            typeof colModel[i].init === "function"
          ) {
            const parentValue = parentRow.value;
            const init = colModel[i].init({ parentRow: parentValue });
            if (init === "" || !init) {
              alert(t("please.checkParentRow", { title: colModel[i].title }));
              return;
            }
          }
        }
        const rowIndx = this.addRow({
          newRow: { state: true },
          checkEditable: false,
        });
        this.goToPage({ rowIndx });
        this.focus({
          rowIndxPage: rowIndx,
        });
      },
    },
    {
      type: "button",
      style:
        tf?.find !== false
          ? "float:right; font-size: 13px; margin-right: 13px;"
          : "display: none;",
      label: t("bt.find"), // label은 TBfind, 없으면 Find
      cls: "btn-sm btn-primary-border", // class이름 pq-search-btn
      listener: focusHandler, // focusHandler 이벤트 발생
    },
    {
      type: "textbox", // type은 textbox
      style:
        tf?.find !== false
          ? "float:right; font-size: 13px !important; height: 32px !important"
          : "display: none;",
      attr: 'placeholder="' + t("toolbar.enterYourKeyword") + '"',
      //	placeholor는 TBenterYourKeyword 값이 있다면 TBenterYourKeyword, 값이 없으면 enter your keyword
      cls: "findValue", // class이름 findValue
      listeners: [
        {
          timeout: findHandler,
        },
        // {
        //   change: (evt) => {
        //     findKeyword = evt.target.value;
        //   },
        // },
      ],
      // listener: { timeout: findHandler }, // timeout:findHandler 이벤트 발생 => 사용자가 검색 기능 사용 시 검색 대상 데이터 찾을 때까지 대기할 시간 지정
    },
    {
      type: "select",
      style:
        tf?.find !== false
          ? "float:right; !important; margin-bottom:0; height: 32px !important"
          : "display: none;",
      cls: "findColumn",
      // listener: findHandler, // findHandlerd 이벤트 발생
      options: function (ui) {
        const CM = ui.colModel;
        const opts = [{ "": t("toolbar.allFields") }];
        for (const column of CM) {
          const obj = {};
          if (column.dataIndx !== "state" && column.hidden !== true) {
            // column.dataType !== "integer"
            obj[column.dataIndx] = column.title;
            opts.push(obj);
          }
        }
        return opts;
      },
      // listener: {
      //   change: (evt) => {
      //     // findKeyword.value = evt.target.value;
      //     findColumn.value = evt.target.value;
      //   },
      //   timeout: findHandler,
      // },
      listeners: [
        {
          timeout: findHandler,
        },
      ],
    },
    // save 활성화 여부 : 저장은 여기서 처리 안함 < 확인 필요
    // {
    //   type: "button",
    //   style:
    //     saveTb === true ? "float: right; font-size: 13px" : "display: none;",
    //   cls: "pq-action-btn btn-navy btn-green", // class이름 pq-action-btn
    //   label: "<img class='ic-bt-save'>" + " " + t("bt.save") + " ",
    //   // label은 <i class='ui-button-icon-primary ui-icon ui-icon-refresh-f'></i> + TBrefresh(없으면 Save)
    //   listener: saveFun,
    // },
  ];
}

/**
 * 저장할 grid setting
 */
const GridSetOptions = [
  "numberCell",
  "hoverMode",
  "freezeCols",
  "freezeRows",
  "columnBorders",
  "rowBorders",
  "stripeRows",
  "groupModel",
  "height",
];

/**
 * ColModel에서 저장할때 제외할 속성
 */
const colModelKickOffs = [
  "title",
  "pq_title",
  "format",
  "init",
  "validations",
  "onChangeMake",
  "search",
  "dataType",
  "optionListRef",
  "optionFilter",
  "editor",
  "editable",
  "editableNewOnly",
];

// const layoutSave = async () => {};

// grid에서 우클릭 시 뜨는 메뉴
export function initRightClickMenu(evt: any, ui: any) {
  const nuxtApp = useNuxtApp();
  const t = nuxtApp.$i18n.t;
  const gridid = this?.$grid_center?.prevObject?.[0]?.id || "";
  if (!gridid) {
    return [];
  }
  return [
    {
      name: t("grid.layout.layoutSave"),
      action: async function () {
        if (!confirm(t("ms.layoutSave"))) return;
        // layoutSave();
        const nuxtApp = useNuxtApp();
        const $api = nuxtApp.$api;
        const res = await $api("/user/grid-layout", {
          method: "post",
          body: {
            pgridid: gridid,

            gridset: JSON.stringify(
              GridSetOptions.reduce((acc, o) => {
                acc[o] = this.option(o); // 옵션명을 키로, 실제 값을 밸류로 주입
                return acc;
              }, {} as any),
            ),

            colmset: JSON.stringify(
              this.colModel.map((c) => {
                const newC = {};
                Object.entries(c).forEach((cc) => {
                  if (colModelKickOffs.includes(cc[0])) return;
                  if (typeof cc[1] == "function") return;
                  if (c.hidden === undefined || c.hidden === false) {
                    newC["hidden"] = false;
                  }
                  newC[cc[0]] = cc[1];
                });
                return newC;
              }),
            ),
          },
        });
        if (res == 1 || res.status.value === "success") {
          // alert(t("success.save"));
        } else {
          // alert(t("fail.save"));
          // ㄴ 표기 안함 2025 02 25
        }
      },
    },
    // {
    //   name: t("layout.layoutSetting"),
    //   action: function () {
    // 왼쪽 위 누르는 것으로 대체
    //     // this.origOptions.modalgridlayoutshow(this); //GridUtil.vue의 modalgridlayoutshow 호출
    //   },
    // },
    {
      name: t("grid.layout.layoutReset"),
      action: async function () {
        if (!confirm(t("confirm.layoutReset"))) {
          return;
        }
        if (t?.$grid_center?.context?.previousElementSibling) {
          alert(t("validations.layoutTab")); // "탭은 레이아웃을 변경 할 수 없습니다."
          return;
        }
        // const grid = pq.grid("#" + this.$grid_center.prevObject[0].id);
        // grid.showLoading();

        const $api = nuxtApp.$api;

        // 그리드 초기화
        const res: number = await $api("/user/grid-layout", {
          method: "delete",
          body: {
            pgridid: gridid,
          },
        });

        // 레이아웃 변경
        if (res === 1) {
          alert(t("success.resetLayout"));
          // grid.hideLoading();
        }
        // 레이아웃 변경사항 없음 (mybatis는 변경이 없으면 0을 return)
        else if (res === 0) {
          alert(t("fail.alreadyResetLayout"));
        }
      },
    },
    "separator",
    {
      name: t("grid.layout.export"),
      subItems: [
        {
          name: "csv",
          action: function () {
            exportData.call(this, "csv");
          },
        },
        {
          name: "html",
          action: function () {
            // exportData.call(this, "html");
            exportData.call(this, "htm");
          },
        },
        {
          name: "json",
          action: function () {
            exportData.call(this, "json");
          },
        },
        {
          name: "xlsx",
          action: function () {
            exportData.call(this, "xlsx");
          },
        },
      ],
    },
    "separator",
    {
      name: t("grid.layout.rownumber"), // "Row Number",
      action: function () {
        const numberCell = this.option("numberCell");
        this.option("numberCell.show", !numberCell.show);
        this.refresh();
      },
    },
    // 필요 없음
    // {
    //   name: "Selection Model",
    //   subItems: [
    //     {
    //       name: "cell",
    //       action: function () {
    //         this.option("hoverMode", "cell");
    //         this.refresh();
    //       },
    //     },
    //     {
    //       name: "row",
    //       action: function () {
    //         this.option("hoverMode", "row");
    //         this.refresh();
    //       },
    //     },
    //   ],
    // },
    {
      name: t("grid.layout.freeze"),
      subItems: [
        this.option("freezeCols")
          ? {
              name: t("grid.layout.colsCancel"),
              action: function () {
                this.option("freezeCols", 0);
                this.refresh();
                // layoutSave();
              },
            }
          : null,
        this.option("freezeRows")
          ? {
              name: t("grid.layout.rowsCancel"),
              action: function () {
                this.option("freezeRows", 0);
                this.refresh();
                // layoutSave();
              },
            }
          : null,
        "separator",
        {
          name: t("grid.layout.freezeCol"),
          action: function (evt: any, ui: any) {
            this.option("freezeCols", ui.colIndx + 1);
            this.refresh();
          },
        },
        {
          name: t("grid.layout.freezeRow"),
          action: function (evt, ui) {
            this.option("freezeRows", ui.rowIndx + 1);
            this.refresh();
          },
        },
      ],
    },
    {
      name: t("grid.layout.columnBorders"), // "Column Borders",
      action: function () {
        this.option("columnBorders", !this.option("columnBorders"));
      },
    },
    {
      name: t("grid.layout.rowBorders"), // "Row Borders",
      action: function () {
        this.option("rowBorders", !this.option("rowBorders"));
      },
    },
    {
      name: t("grid.layout.stripeRows"), // "Stripe Rows",
      icon: "ui-icon ui-icon-shuffle",
      action: function () {
        this.option("stripeRows", !this.option("stripeRows"));
        this.refresh();
      },
    },
    // "separator",
    // {
    //   name: t("grid.layout.undo"), // "Undo",
    //   icon: "ui-icon ui-icon-arrowrefresh-1-n",
    //   disabled: !this.History().canUndo(),
    //   action: function () {
    //     try {
    //       this.History().undo();
    //     } catch (e) {
    //       useDevWarn({
    //         title: "pqgrid 오류",
    //         description: "cannot undo :" + e,
    //       });
    //     }
    //   },
    // },
    // {
    //   name: t("grid.layout.redo"), // "Redo",
    //   icon: "ui-icon ui-icon-arrowrefresh-1-s",
    //   disabled: !this.History().canRedo(),
    //   action: function () {
    //     try {
    //       this.History().redo();
    //     } catch (e) {
    //       useDevWarn({
    //         title: "pqgrid 오류",
    //         description: "cannot redo : " + e,
    //       });
    //     }
    //   },
    // },
    "separator",
    // Group 되살림 - 2025.04.09 최강호
    {
      name: t("grid.layout.group"),
      icon: "ui-icon ui-icon-calculator",
      action: function () {
        const b = this.option("groupModel.on");
        this.Group().option({ on: !b });
      },
    },
    "separator",
    {
      name: "Copy",
      icon: "ui-icon ui-icon-copy",
      shortcut: "Ctrl - C",
      tooltip: "Works only for copy / paste within the same grid",
      action: function () {
        this.copy();
      },
    },
    {
      name: "Paste",
      icon: "ui-icon ui-icon-clipboard",
      shortcut: "Ctrl - V",
      action: function () {
        this.paste();
      },
    },
  ];
}

export function timeEditor(ui: any) {
  const { $cell, cellData, column, rowIndx, colIndx } = ui;
  const thisGrid = $cell.closest(".pq-grid").pqGrid("instance");

  // 컨테이너 생성 및 추가
  const pickerContainer = document.createElement("div");
  pickerContainer.classList.add("vue-datepicker");
  // 편집할 입력칸에 생성한 div추가
  $cell.empty().append(pickerContainer);

  // 기존 데이터가 없을경우 timePicker에 0:0:0으로, 기존데이터가 있을경우 기존값을 timePicker 형식에 맞게 변형
  const currentTime = ref({
    hours: "0",
    minutes: "0",
    seconds: "0",
  });

  if (cellData) {
    currentTime.value = {
      hours: cellData.substring(0, 2),
      minutes: cellData.substring(2, 4),
      seconds: cellData.substring(4, 6),
    };
  }

  // 렌더함수 h를 사용하여 에디터에 VueDatePicker 활성화

  const app = createApp({
    setup() {
      const timePicker = ref();

      onMounted(() => {
        nextTick(() => {
          if (timePicker.value) {
            timePicker.value.openMenu();
          }
        });
      });

      // 저장/닫기 로직 통합
      const closeEditor = (save = false) => {
        if (save) {
          thisGrid.saveEditCell();
        }
        cleanUp();
        thisGrid.quitEditMode();
        // 실제 unmount는 PQGrid의 editorEnd 이벤트에서 공통 처리됨
      };

      return { currentTime, timePicker, closeEditor };
    },

    render() {
      return h(
        VueDatePicker,
        {
          ref: "timePicker",
          // render: Vue 컴포넌트를 렌더링
          // h: VueDatePicker에 아래 요소를 구현함
          modelValue: currentTime.value,
          autoApply: true,
          enableSeconds: false,
          locale: ko,
          timePicker: true,
          teleport: true,
          "onUpdate:modelValue": (date: {
            hours: string;
            minutes: string;
            seconds: string;
          }) => {
            currentTime.value = date;
            ui.cellData =
              date.hours.toString().padStart(2, "0") +
              date.minutes.toString().padStart(2, "0") +
              date.seconds.toString().padStart(2, "0");
            // this.closeEditor(true);
          },
          onClosed: () => {
            this.closeEditor(false);
          },
          style: {
            width: ui.column.width >= "150" ? ui.column.width + "px" : "150px",
          },
        },
        {
          // , onInput, onEnter, style
          "dp-input": ({ value }) =>
            h("input", {
              type: "button",
              value,
              onKeydown: (e: KeyboardEvent) => {
                if (e.key === "Escape") this.closeEditor(false);
                if (e.key === "Enter") this.closeEditor(true);
              },
              class:
                "dp__pointer dp__input_readonly dp__input dp__input_icon_pad dp__input_reg",
              style: {
                width:
                  ui.column.width >= 150 ? ui.column.width + "px" : "150px",
              },
            }),
        },
      );
    },
  });

  app.mount(pickerContainer);

  // 종료시점 관리
  const cleanUp = () => {
    app.unmount();
    if (pickerContainer.parentNode) {
      pickerContainer.remove();
    }
    // 포커스 복구
    setTimeout(() => {
      thisGrid.setSelection({ rowIndx: rowIndx, colIndx: colIndx });
    }, 0);
  };

  // 에디터 종료시 unmount
  thisGrid.one("editorEnd", cleanUp);
}

export function dateEditor(ui: any) {
  const { $cell, cellData, column, rowIndx, colIndx } = ui;
  const thisGrid = $cell.closest(".pq-grid").pqGrid("instance");

  // 컨테이너 생성 및 추가
  const pickerContainer = document.createElement("div");
  pickerContainer.classList.add("vue-datepicker");
  $cell.empty().append(pickerContainer);

  // 셀 데이터
  const currentDate = ref();
  if (cellData && cellData.replace(/-/g, "") !== "00000000") {
    currentDate.value = dayjs(cellData, "YYYYMMDD").toDate();
  }

  // 에디터 옵션 파싱
  const editorOption =
    typeof column.editor.dateEditorOption === "function"
      ? column.editor.dateEditorOption(ui)
      : column.editor.dateEditorOption;

  // vue datepicker 생성
  const app = createApp({
    setup() {
      const datePicker = ref();

      // 엔터 키로 진입 시 바로 메뉴를 여는 핵심 로직
      onMounted(() => {
        nextTick(() => {
          if (datePicker.value) {
            datePicker.value.openMenu();
          }
        });
      });

      // 저장/닫기 로직 통합
      const closeEditor = (save = false) => {
        if (save) {
          thisGrid.saveEditCell();
        }
        cleanUp();
        thisGrid.quitEditMode();
        // 실제 unmount는 PQGrid의 editorEnd 이벤트에서 공통 처리됨
      };

      return { currentDate, datePicker, closeEditor };
    },
    render() {
      return h(
        VueDatePicker,
        {
          ref: "datePicker",
          modelValue: this.currentDate,
          autoApply: true,
          locale: ko, // string에서 ko객체로변경
          timeConfig: { enableTimePicker: false },
          teleport: true,
          arrowNavigation: true,
          format: "yyyy-MM-dd",
          maxDate: editorOption?.maxDate
            ? dayjs(editorOption.maxDate, "YYYYMMDD").toDate()
            : null,
          minDate: editorOption?.minDate
            ? dayjs(editorOption.minDate, "YYYYMMDD").toDate()
            : null,
          "onUpdate:modelValue": (date: Date) => {
            ui.cellData = dayjs(date).format("YYYYMMDD");
            this.closeEditor(true); // 날짜 선택 시 저장 및 종료
          },
          onClosed: () => {
            this.closeEditor(false);
          },
          style: { width: column.width >= 150 ? column.width + "px" : "150px" },
        },
        {
          "dp-input": ({ value }) =>
            h("input", {
              type: "button",
              value: currentDate.value
                ? dayjs(currentDate.value).format("YYYY-MM-DD")
                : value,
              class:
                "dp__pointer dp__input_readonly dp__input dp__input_icon_pad dp__input_reg",
              style: {
                width: column.width >= 150 ? column.width + "px" : "150px",
              },
              onKeydown: (e: KeyboardEvent) => {
                if (e.key === "Escape") this.closeEditor(false);
                if (e.key === "Enter") this.closeEditor(true);
              },
            }),
        },
      );
    },
  });

  app.mount(pickerContainer);

  // 종료시점 관리
  const cleanUp = () => {
    app.unmount();
    if (pickerContainer.parentNode) {
      pickerContainer.remove();
    }
    // 포커스 복구
    setTimeout(() => {
      thisGrid.setSelection({ rowIndx: rowIndx, colIndx: colIndx });
    }, 0);
  };

  // 에디터 종료시 unmount
  thisGrid.one("editorEnd", cleanUp);
}

export function customSelector(ui: any) {
  // SelectElement component를 집어넣 을 div 생성
  const pickerContainer = document.createElement("div");
  pickerContainer.classList.add("search-select");
  pickerContainer.style.width =
    ui.column.width >= 150 ? ui.column.width + "px" : "200px";
  // 기존 내용을 숨김
  // 편집할 입력칸에 생성한 div추가
  ui.$cell.empty().append(pickerContainer);

  // 옵션 데이터 가공 (flatMap + map 조합으로 단순화)
  const optionList = (ui.editor.options || []).flatMap((option: any) =>
    Object.entries(option).map(([value, label]) => ({
      value: String(value),
      label,
    })),
  );
  const currentData = {
    [ui.dataIndx]: ui.cellData,
  };
  const thisGrid = ui.$cell.closest(".pq-grid").pqGrid("instance");
  // eslint-disable-next-line vue/one-component-per-file
  const app = createApp({
    render() {
      return h(CustomSelectElement, {
        initValue: currentData,
        options: ui,
        optionList: optionList,
        "onUpdate:value": (newValue: any) => {
          ui.cellData = newValue;
          if (!ui.editor.multiSelect && newValue[ui.dataIndx]) {
            thisGrid.saveEditCell();
            thisGrid.quitEditMode();
          }
        },
        "onSave-editor": (event: KeyboardEvent) => {
          handleEditorNavigation(event);
        },
      });
    },
  });

  // 언마운트 로직 (메모리 누수 방지)
  let isUnmounted = false;
  const unmountApp = () => {
    if (isUnmounted) return;
    isUnmounted = true;

    // 이벤트 리스너 제거
    document.removeEventListener("keydown", escapeHandler);
    thisGrid.off("history beforeNewData editorEnd", unmountApp);
    thisGrid.quitEditMode();
    app.unmount();

    // 언마운트 후 해당 셀 선택 유지
    setTimeout(() => {
      thisGrid.setSelection({ rowIndx: ui.rowIndx, colIndx: ui.colIndx });
    }, 0);
  };

  // 5. 키보드 핸들러 (Escape)
  const escapeHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      thisGrid.quitEditMode();
      unmountApp();
    }
  };

  // 6. 에디터 네비게이션 (Enter / Tab)
  const handleEditorNavigation = (event: KeyboardEvent) => {
    const isMulti = ui.editor.multiSelect;

    if (event.key === "Enter" && !isMulti && ui.cellData[ui.dataIndx]) {
      thisGrid.saveEditCell();
      thisGrid.quitEditMode();
    } else if (event.key === "Tab" && isMulti && ui.cellData[ui.dataIndx]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      thisGrid.saveEditCell();
      thisGrid.quitEditMode();

      setTimeout(() => {
        thisGrid.setSelection({ rowIndx: ui.rowIndx, colIndx: ui.colIndx + 1 });
      }, 0);
    }
  };

  document.addEventListener("keydown", escapeHandler);
  thisGrid.on("history beforeNewData editorEnd", unmountApp);

  // 8. 마운트
  app.use(vueform);
  app.mount(pickerContainer);
}
