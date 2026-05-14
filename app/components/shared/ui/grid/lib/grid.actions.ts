// @ts-nocheck
import type { ToolbarItems } from "../model/types/grid.types";

/**
 * Grid 데이터를 export 하는 function
 */
export function exportData(format: string) {
  const options: any = {
    format: format,
    skipHiddenCols: true,
    skipHiddenRows: true,
  };

  const nowRoute = useRoute();

  options.eachCell = function (cell: any) {
    const htmlRegex = /<[^>]*>/g;
    if (htmlRegex.test(cell.value)) {
      if (typeof cell.value === "string" && cell.value.includes("▼"))
        cell.value = " ";
    }
  };

  if (format === "xlsx") {
    options.render = true;
    options.eachCol = function (col: any) {
      delete col.fontSize;
    };
    options.eachRowHead = function (row: any) {
      row.cells.forEach((item: any) => {
        delete item.fontSize;
      });
    };
  }

  let blob = this.exportData(options);

  if (typeof blob === "string") {
    blob = new Blob([blob]);
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `logistics_${nowRoute.meta.title}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 내부 헬퍼: 이미 선택된 Index를 찾는 function
 */
function getSelectedIdx(focusRules: Array<object>, sel: any) {
  const current = sel?.address?.();
  if (current.length < 1) return -1;
  return focusRules.findIndex(
    (fd) => fd.rowIndx === current[0].r1 && fd.colIndx === current[0].c1,
  );
}

/**
 * 내부 헬퍼: 그리드 toolbar내 검색을 위한 이벤트
 */
function findHandler() {
  const cls = "." + this.options.toolbar.cls;
  const toolbar = document.querySelector(cls) as HTMLElement;
  const value = (toolbar.querySelector(".findValue") as HTMLInputElement).value;
  const dataIndx = (toolbar.querySelector(".findColumn") as HTMLSelectElement)
    .value;
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
 * 내부 헬퍼: 검색 결과 포커스 핸들러
 */
function focusHandler() {
  const cls = "." + this.options.toolbar.cls;
  const toolbar = document.querySelector(cls) as HTMLElement;
  const findKeyword = (toolbar.querySelector(".findValue") as HTMLInputElement)
    .value;
  const findRules = this.options.findRules || [];
  if (!findKeyword) return;
  const gridData = this.getData?.();
  const colModel = this.getColModel?.();

  const focusData = [];
  const valueUpper = findKeyword.toUpperCase();
  const renderedData = gridData.map((rowData) => {
    const newRow: any = {};
    colModel.forEach((col) => {
      const row = rowData[col.dataIndx];
      const editor = col?.editor;
      let options = editor?.options || [];
      if (typeof options == "function") {
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
 * grid 내의 버튼 툴바 초기화 (add reset delete search 등)
 */
export function initToolbarItems(tf?: ToolbarItems, parentRow: any) {
  const nuxtApp = useNuxtApp();
  const t = nuxtApp.$i18n.t;
  return [
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
      listeners: [{ timeout: findHandler }],
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
      listeners: [{ timeout: findHandler }],
    },
  ];
}

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

/**
 * grid에서 우클릭 시 뜨는 메뉴 정의 (레이아웃 저장, 엑셀, 행고정 등)
 */
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
        const $api = nuxtApp.$api;
        await $api("/user/grid-layout", {
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
          body: { pgridid: gridid },
        });

        if (res === 1) alert(t("success.resetLayout"));
        else if (res === 0) alert(t("fail.alreadyResetLayout"));
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
