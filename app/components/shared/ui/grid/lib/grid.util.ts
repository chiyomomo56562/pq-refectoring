// @ts-nocheck
import { createApp, h, ref, onMounted, nextTick } from "vue";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import { ko } from "date-fns/locale";
import CustomSelectElement from "../ui/CustomSelectElement.vue";
import vueform from "@vueform/vueform";
import dayjs from "dayjs/esm";
import type { ToolbarItems, ColModel } from "../model/types/grid.types";

/**
 * Grid 데이터를 export 하는 function
 */
export function exportData(format: string) {
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
      style:
        (tf?.reset ?? true)
          ? "float:right; height: auto; margin-right: 0; "
          : "display: none;",
      label:
        "<span class='i-tabler-rotate-clockwise'></span>" +
        "<span> " +
        t("bt.reset") +
        "<span> ",
      listener: function () {
        if (!confirm(t("grid.rollback"))) {
          return;
        }
        this.rollback();
        this.history({ method: "reset" });
      },
    },
    // ㄱ delete 활성화 여부 ㄱ
    {
      type: "button",
      style:
        (tf?.delete ?? false)
          ? "float: right; height: auto; margin-right: 0; "
          : "display: none;",
      label:
        "<span class='i-humbleicons-minus'></span>" +
        "<span> " +
        t("bt.delete") +
        " </span>",
      listener: function () {
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
          alert(t("choiceRowZero"));
          return;
        }
      },
    },
    // add 활성화 여부
    {
      type: "button",
      style:
        (tf?.add ?? true) ? "float: right; height: auto;" : "display: none;",
      label:
        "<span class='i-humbleicons-plus'></span>" +
        " <span>" +
        t("bt.add") +
        "</span> ",
      listener: function () {
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
      label: t("bt.find"),
      cls: "btn-sm btn-primary-border",
      listener: focusHandler,
    },
    {
      type: "textbox",
      style:
        tf?.find !== false
          ? "float:right; font-size: 13px !important; height: 32px !important"
          : "display: none;",
      attr: 'placeholder="' + t("toolbar.enterYourKeyword") + '"',
      cls: "findValue",
      listeners: [
        {
          timeout: findHandler,
        },
      ],
    },
    {
      type: "select",
      style:
        tf?.find !== false
          ? "float:right; !important; margin-bottom:0; height: 32px !important"
          : "display: none;",
      cls: "findColumn",
      options: function (ui) {
        const CM = ui.colModel;
        const opts = [{ "": t("toolbar.allFields") }];
        for (const column of CM) {
          const obj = {};
          if (column.dataIndx !== "state" && column.hidden !== true) {
            obj[column.dataIndx] = column.title;
            opts.push(obj);
          }
        }
        return opts;
      },
      listeners: [
        {
          timeout: findHandler,
        },
      ],
    },
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
        const nuxtApp = useNuxtApp();
        const $api = nuxtApp.$api;
        const res = await $api("/user/grid-layout", {
          method: "post",
          body: {
            pgridid: gridid,

            gridset: JSON.stringify(
              GridSetOptions.reduce((acc, o) => {
                acc[o] = this.option(o);
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
      },
    },
    {
      name: t("grid.layout.layoutReset"),
      action: async function () {
        if (!confirm(t("confirm.layoutReset"))) {
          return;
        }
        if (t?.$grid_center?.context?.previousElementSibling) {
          alert(t("validations.layoutTab"));
          return;
        }

        const $api = nuxtApp.$api;

        const res: number = await $api("/user/grid-layout", {
          method: "delete",
          body: {
            pgridid: gridid,
          },
        });

        if (res === 1) {
          alert(t("success.resetLayout"));
        }
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
      name: t("grid.layout.rownumber"),
      action: function () {
        const numberCell = this.option("numberCell");
        this.option("numberCell.show", !numberCell.show);
        this.refresh();
      },
    },
    {
      name: t("grid.layout.freeze"),
      subItems: [
        this.option("freezeCols")
          ? {
              name: t("grid.layout.colsCancel"),
              action: function () {
                this.option("freezeCols", 0);
                this.refresh();
              },
            }
          : null,
        this.option("freezeRows")
          ? {
              name: t("grid.layout.rowsCancel"),
              action: function () {
                this.option("freezeRows", 0);
                this.refresh();
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
      name: t("grid.layout.columnBorders"),
      action: function () {
        this.option("columnBorders", !this.option("columnBorders"));
      },
    },
    {
      name: t("grid.layout.rowBorders"),
      action: function () {
        this.option("rowBorders", !this.option("rowBorders"));
      },
    },
    {
      name: t("grid.layout.stripeRows"),
      icon: "ui-icon ui-icon-shuffle",
      action: function () {
        this.option("stripeRows", !this.option("stripeRows"));
        this.refresh();
      },
    },
    "separator",
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

  const pickerContainer = document.createElement("div");
  pickerContainer.classList.add("vue-datepicker");
  $cell.empty().append(pickerContainer);

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

      const closeEditor = (save = false) => {
        if (save) {
          thisGrid.saveEditCell();
        }
        cleanUp();
        thisGrid.quitEditMode();
      };

      return { currentTime, timePicker, closeEditor };
    },

    render() {
      return h(
        VueDatePicker,
        {
          ref: "timePicker",
          modelValue: this.currentTime,
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
            this.currentTime = date;
            ui.cellData =
              date.hours.toString().padStart(2, "0") +
              date.minutes.toString().padStart(2, "0") +
              date.seconds.toString().padStart(2, "0");
          },
          onClosed: () => {
            this.closeEditor(false);
          },
          style: {
            width: ui.column.width >= "150" ? ui.column.width + "px" : "150px",
          },
        },
        {
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

  const cleanUp = () => {
    app.unmount();
    if (pickerContainer.parentNode) {
      pickerContainer.remove();
    }
    setTimeout(() => {
      thisGrid.setSelection({ rowIndx: rowIndx, colIndx: colIndx });
    }, 0);
  };

  thisGrid.one("editorEnd", cleanUp);
}

export function dateEditor(ui: any) {
  const { $cell, cellData, column, rowIndx, colIndx } = ui;
  const thisGrid = $cell.closest(".pq-grid").pqGrid("instance");

  const pickerContainer = document.createElement("div");
  pickerContainer.classList.add("vue-datepicker");
  $cell.empty().append(pickerContainer);

  const currentDate = ref();
  if (cellData && cellData.replace(/-/g, "") !== "00000000") {
    currentDate.value = dayjs(cellData, "YYYYMMDD").toDate();
  }

  const editorOption =
    typeof column.editor.dateEditorOption === "function"
      ? column.editor.dateEditorOption(ui)
      : column.editor.dateEditorOption;

  const app = createApp({
    setup() {
      const datePicker = ref();

      onMounted(() => {
        nextTick(() => {
          if (datePicker.value) {
            datePicker.value.openMenu();
          }
        });
      });

      const closeEditor = (save = false) => {
        if (save) {
          thisGrid.saveEditCell();
        }
        cleanUp();
        thisGrid.quitEditMode();
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
          locale: ko,
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
            this.closeEditor(true);
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
              value: this.currentDate
                ? dayjs(this.currentDate).format("YYYY-MM-DD")
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

  const cleanUp = () => {
    app.unmount();
    if (pickerContainer.parentNode) {
      pickerContainer.remove();
    }
    setTimeout(() => {
      thisGrid.setSelection({ rowIndx: rowIndx, colIndx: colIndx });
    }, 0);
  };

  thisGrid.one("editorEnd", cleanUp);
}

export function customSelector(ui: any) {
  const pickerContainer = document.createElement("div");
  pickerContainer.classList.add("search-select");
  pickerContainer.style.width =
    ui.column.width >= 150 ? ui.column.width + "px" : "200px";
  ui.$cell.empty().append(pickerContainer);

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

  let isUnmounted = false;
  const unmountApp = () => {
    if (isUnmounted) return;
    isUnmounted = true;

    document.removeEventListener("keydown", escapeHandler);
    thisGrid.off("history beforeNewData editorEnd", unmountApp);
    thisGrid.quitEditMode();
    app.unmount();

    setTimeout(() => {
      thisGrid.setSelection({ rowIndx: ui.rowIndx, colIndx: ui.colIndx });
    }, 0);
  };

  const escapeHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      thisGrid.quitEditMode();
      unmountApp();
    }
  };

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

  app.use(vueform);
  app.mount(pickerContainer);
}
