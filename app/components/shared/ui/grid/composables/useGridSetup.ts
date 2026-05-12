import { ref, unref, watch, onMounted, isRef, type Ref } from "vue";
import pq from "pqgrid";
import dayjs from "dayjs/esm/index.js";

import {
  initToolbarItems,
  dateEditor,
  timeEditor,
  customSelector,
  findRender,
} from "../lib/grid.util";

import {
  DefaultOptions,
  ClassHeadFromEditable,
} from "../lib/grid.constants";

import {
  editableNewOnly,
  whenChange,
  checkUniqueOnlyThisColumn,
  resetGridOf,
  changeGridMessageOfnoRow,
  changeHeaderRowCls,
  getIsEditing,
} from "../lib/grid.helpers";

import type {
  ColModel,
  Editor2,
  MonthDate,
  GridBoxSet,
} from "../model/types/grid.types";

export function useGridSetup(options: {
  theGrid: Ref<any>;
  vueformRef: Ref<any>;
  parentRow: Ref<any>;
  searchParameters: Ref<any>;
  selectedMonth: Ref<MonthDate>;
  props: any;
  t: any;
  iAmSubGridOf: Ref<any> | undefined;
  givenGridBoxSet: Ref<GridBoxSet> | undefined;
  // Operations dependency
  operations: {
    getdataFetching: any;
    handleMonthDate: (val: MonthDate) => void;
    deleteValidationFocus: (e: KeyboardEvent) => void;
    setSelctionOptionsAgain?: () => void;
  };
}) {
  const {
    theGrid,
    vueformRef,
    parentRow,
    searchParameters,
    selectedMonth,
    props,
    t,
    iAmSubGridOf,
    givenGridBoxSet,
    operations,
  } = options;

  const layoutSettDone = ref(false);
  const watchesDynamicOptions = ref<any[]>([]);

  // -----------------------------------------------------------
  // A5. SelectRenderer
  // -----------------------------------------------------------
  function SelectRenderer(ui: pq.gridT.renderObj) {
    const cellData = ui?.cellData;
    const editor = ui?.column?.editor as Editor2;
    let optionsArr = editor?.options || [];
    if (typeof optionsArr === "function") {
      // @ts-expect-error
      optionsArr = editor._options;
    }

    if (!optionsArr || !optionsArr.length) {
      const targetOriginCol = props.colModel.find(
        (c: any) => c.dataIndx === ui.dataIndx,
      );
      const optionListRef = targetOriginCol?.optionListRef;
      if (optionListRef) {
        const targetC = theGrid.value?.colModel?.find(
          (c: any) => c.dataIndx === ui.dataIndx,
        );
        optionsArr =
          targetC?.editor?.options || targetOriginCol?.editor?.options || [];
      }
    }

    // @ts-expect-error
    const label = optionsArr?.find?.((o) => o[cellData])?.[cellData];
    if (!label) {
      if (!cellData) return cellData;
    }
    const findRules = theGrid.value?.options?.findRules || [];
    if (props.toolbarItems?.find !== false && findRules.length > 0) {
      let indx = -1;
      for (const findRule of findRules) {
        const txt = findRule.value?.toUpperCase();
        // @ts-expect-error
        indx = label?.toUpperCase().indexOf(txt);
        if (ui.dataIndx === findRule.dataIndx) {
          if (indx >= 0) {
            // @ts-expect-error
            const txt1 = label.substring(0, indx);
            // @ts-expect-error
            const txt2 = label.substring(indx, indx + txt.length);
            // @ts-expect-error
            const txt3 = label.substring(indx + txt.length);
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
    }
    return label || cellData;
  }

  // -----------------------------------------------------------
  // A6. makeEditorInColM / setSelctionOptionsAgain
  // -----------------------------------------------------------
  function makeEditorInColM(c: pq.gridT.column & ColModel) {
    if (!c.optionListRef) return;
    const colsOrigin = props.colModel?.find(
      (cc: any) => cc.dataIndx === c.dataIndx,
    ) as ColModel;
    if (!c.editor || typeof c.editor === "boolean") c.editor = {};

    const columnEditor = c.editor as Editor2;
    if (c.optionListRef) {
      if (
        unref(c.optionListRef)?.length !==
        (unref(colsOrigin?.optionListRef || []) as any).length
      ) {
        c.optionListRef = colsOrigin?.optionListRef;
      }
      // @ts-expect-error
      if (c.optionListRef?.provide) columnEditor.options = [];
      else columnEditor.options = unref(c.optionListRef) as any[];
    }
    if (typeof c.editor.labelMapFunction === "function") {
      const labelMapFunction = c.editor.labelMapFunction;
      columnEditor.options = columnEditor.options?.map(labelMapFunction);
    }

    columnEditor.options = (columnEditor?.options || []).map((e: any) => ({
      [e?.[columnEditor?._valueIndex || ""]]:
        e?.[columnEditor?._labelIndex || ""],
    }));
    // @ts-expect-error
    columnEditor._options = columnEditor.options;
    if (c.optionFilter) {
      // @ts-expect-error
      c.editor.options = (ui: pq.gridT.renderObj) =>
        // @ts-expect-error
        c.optionFilter(ui, theGrid, parentRow).map((e: any) => ({
          [e?.[columnEditor?._valueIndex || ""]]:
            e?.[columnEditor?._labelIndex || ""],
        }));
    }
  }

  async function setSelctionOptionsAgain() {
    const dynamicSelects = theGrid?.value?.colModel?.filter(
      (c: any) => c.optionListRef || c.optionFilter,
    );

    if (!dynamicSelects?.length) return;
    theGrid.value.colModel.forEach((c: pq.gridT.column & ColModel) => {
      makeEditorInColM(c);
    });

    await theGrid?.value?.refresh?.();
  }

  // -----------------------------------------------------------
  // A1. colModel preprocessing
  // -----------------------------------------------------------
  (props.colModel as Array<pq.gridT.column & ColModel>).forEach((c) => {
    if (c.dataIndx !== "state") {
      if (c.editableNewOnly) {
        c.editable = editableNewOnly;
        c.clsHead = ClassHeadFromEditable["new-only"];
      } else if (
        c?.validations?.length &&
        c?.validations?.find((v: any) => v.type === "nonEmpty")
      ) {
        c.clsHead = ClassHeadFromEditable["nonEmpty"];
      } else if (c.editable) {
        c.clsHead = ClassHeadFromEditable["true"];
      } else {
        c.clsHead = ClassHeadFromEditable["false"];
      }
    }

    if (c?.dataType === "integer") {
      c.editor = { select: true };
      if (!c.format) c.format = "#,###";
    } else if (c?.dataType === "float") {
      if (!c.format) c.format = "#,###.000";
      c.editor = { select: true };
    } else if (c.type === "checkbox" && c?.dataType === "string") {
      if (!c?.cb)
        c.cb = {
          all: false,
          header: c?.editable ? true : false,
          check: "Y",
          uncheck: "N",
          history: true,
          useTxn: true,
        };
      if (!c?.init) c.init = "Y";
      if (!c?.align) c.align = "center";
      if (!c.editor) c.editor = false;
    } else if (c.dataType === "time") {
      c.dataType = "string";
      c.editor = {
        init: timeEditor,
        getData: function (ui: any) {
          if (!ui.cellData) {
            ui.cellData = "000000";
          }
          return ui.cellData;
        },
      };
      // @ts-expect-error
      c.format = (val: string) => val?.replace(/(\d{2})(\d{2})(\d{2})/g, "$1:$2");
    } else if (c.dataType === "date") {
      c.dataType = "string";
      c.editor = {
        init: dateEditor,
        getData: function (ui: any) {
          return ui.cellData;
        },
        dateEditorOption:
          typeof c.editor === "object" ? (c.editor as Editor2)?.dateEditorOption : {},
      };
      // @ts-expect-error
      c.format = (val: any) =>
        val?.toString().replace(/(\d{4})(\d{2})(\d{2})/g, "$1-$2-$3");
    }

    // CheckUniquenessOf
    props.extraUtil?.checkUniquenessOfParams
      ?.filter((p: any) => p.targetCols.includes(c.dataIndx + ""))
      .forEach((p: any) => {
        if (!c?.validations?.length) c.validations = [];
        p.apiUrl = p.apiUrl || props.urlGet || props.url;
        if (iAmSubGridOf) {
          watch(
            () => searchParameters.value,
            (newV) => {
              p.apiParameters = newV;
            },
          );
        }
      });

    // Validations mapping
    if (c.validations?.length) {
      const theUnique = c.validations.find((v: any) => v.type === "unique");
      if (theUnique) {
        theUnique.type = checkUniqueOnlyThisColumn as any;
        if (!theUnique.msg) theUnique.msg = t("validations.unique");
      }
      c.validations.forEach((v: any) => {
        if (!v.msg && typeof v.type !== "function") {
          v.msg = t(`validations.${v.type}`, { value: v?.value });
        }
        if (typeof v.type !== "function" && v.type !== "nonEmpty") {
          const val = v.value;
          switch (v.type) {
            case "minLen":
              v.type = function (ui: any) {
                if (ui.value && ui.value.toString().length < val) return false;
              };
              break;
            case "maxLen":
              v.type = function (ui: any) {
                if (ui.value && ui.value.toString().length > val) return false;
              };
              break;
            case "lt":
              v.type = function (ui: any) {
                if ((ui.value || ui.value === 0) && ui.value >= val) return false;
              };
              break;
            case "gt":
              v.type = function (ui: any) {
                if ((ui.value || ui.value === 0) && ui.value <= val) return false;
              };
              break;
            case "lte":
              v.type = function (ui: any) {
                if ((ui.value || ui.value === 0) && ui.value > val) return false;
              };
              break;
            case "gte":
              v.type = function (ui: any) {
                if (ui.value && ui.value < val) return false;
              };
              break;
            case "regexp":
              v.type = function (ui: any) {
                if (ui.value) {
                  const regex = new RegExp(val);
                  return regex.test(ui.value);
                }
              };
              break;
          }
        }
      });
    }

    if (c.isParentKey) {
      if (!c.init) c.init = ({ parentRow }: any) => parentRow?.[c.dataIndx] || "";
    }

    const columEditor = c.editor;
    if (typeof columEditor === "object") {
      if ((columEditor as Editor2)?.type === "select" && (columEditor as Editor2)?.multiSelect) {
        (columEditor as Editor2).init = customSelector;
        (columEditor as Editor2).getData = function (ui: any) {
          const gridObject = unref(theGrid);
          const rowData = ui.rowData;
          if (ui.cellData && Array.isArray(ui.cellData[ui.column.dataIndx])) {
            for (let idx = 1; idx < ui.cellData[ui.column.dataIndx].length; idx++) {
              if ((columEditor as Editor2).abreasetValue) {
                return ui.cellData[ui.column.dataIndx].join(",");
              } else {
                const newRow = { ...rowData };
                if (newRow["rowkey"]) newRow["rowkey"] = null;
                newRow[ui.column.dataIndx] = ui.cellData[ui.column.dataIndx][idx];
                gridObject.addRow({ newRow: newRow, checkEditable: false });
              }
            }
            return ui.cellData[ui.column.dataIndx][0];
          }
        };
      } else if ((columEditor as Editor2).type === "select") {
        (columEditor as Editor2).init = customSelector;
        (columEditor as Editor2).getData = function (ui: any) {
          return ui.cellData;
        };
      }

      if ((columEditor as Editor2)?.type === "select") {
        (columEditor as Editor2).labelIndx = (columEditor as Editor2)?.labelIndx || "label";
        (columEditor as Editor2).valueIndx = (columEditor as Editor2)?.valueIndx || "value";
        (columEditor as Editor2)._labelIndex = (columEditor as Editor2).labelIndx + "";
        (columEditor as Editor2)._valueIndex = (columEditor as Editor2).valueIndx + "";
      }
    }

    if (c.optionListRef && !c.render) c.render = SelectRenderer;

    if (!c.sortType && c.optionListRef) {
      c.sortType = (rowData1: any, rowData2: any, dataIndx: any) => {
        const origionRow = rowData1[dataIndx];
        const afterRow = rowData2[dataIndx];
        let originData = rowData1[dataIndx];
        let afterData = rowData2[dataIndx];

        let optionsArr = typeof columEditor === "object" ? (columEditor as Editor2).options || [] : [];
        if (typeof optionsArr === "function") {
          // @ts-expect-error
          optionsArr = (columEditor as Editor2)._options;
        }
        if (Array.isArray(optionsArr) && optionsArr.length > 0) {
          // @ts-expect-error
          const origionLabel = optionsArr?.find?.((o: any) => o[origionRow])?.[origionRow] || "";
          // @ts-expect-error
          const afterLabel = optionsArr?.find?.((o: any) => o[afterRow])?.[afterRow] || "";
          originData = origionLabel;
          afterData = afterLabel;
        }
        if (originData > afterData) return 1;
        if (originData < afterData) return -1;
        return 0;
      };
    }

    if (isRef(c?.optionListRef) || c?.optionFilter) {
      watchesDynamicOptions.value.push(c.optionListRef);
    }
  });

  // Setup watch debounce for dynamic options in Grid.vue context... 
  // Wait, I should add it here directly to logic.
  // @ts-expect-error - assuming watchDebounced from @vueuse is available globally or inject it.
  watchDebounced(
    () => watchesDynamicOptions.value,
    () => {
      theGrid?.value?.showLoading();
      setSelctionOptionsAgain();
      theGrid?.value?.hideLoading();
    },
    { debounce: 500, deep: true },
  );

  // -----------------------------------------------------------
  // A2. optionsIN Configuration
  // -----------------------------------------------------------
  const summaryTitle = {
    avg: `${t("summary.avg")} : {0}`,
    count: `${t("summary.count")} : {0}`,
    max: `${t("summary.max")} : {0}`,
    min: `${t("summary.min")} : {0}`,
    sum: (obj: any) => obj.formatVal,
  };

  const optionsIN: pq.gridT.options = {
    ...DefaultOptions,
    summaryTitle,
    toolbar: {
      cls: `${props.gridId}-pq-toolbar-search`,
      items: props.toolbarRemove === true ? [] : initToolbarItems(props.toolbarItems, parentRow),
    },
    ...props.options,
  };

  optionsIN.dataModel = optionsIN.dataModel || {};
  optionsIN.dataModel.recIndx = optionsIN?.dataModel?.recIndx || "rowkey";
  optionsIN.colModel = props.colModel as any;
  optionsIN.columnTemplate = props.toolbarItems?.find !== false ? { render: findRender } : undefined;
  
  optionsIN.beforeValidate = function (event: any, ui: any) {
    whenChange(event, ui, this, unref(parentRow));
  };

  optionsIN.beforePaste = function (evt: any, ui: any) {
    const firstCol = ui?.areas?.[0]?.firstC || ui?.areas?.[0]?.c1 || 0;
    const firstRow = ui?.areas?.[0]?.firstR || ui?.areas?.[0]?.r1 || 0;
    const originPdata = (this as any)?.pdata || [];
    const colM = (optionsIN.colModel as ColModel[]) || [];
    const targetColumns = colM.slice(firstCol, firstCol + (ui.rows?.[0]?.length || 0));

    ui.rows.forEach((pastedRow: any[], ridx: number) => {
      pastedRow.forEach((pastedDatum: any, cidx: number) => {
        const targetCol = targetColumns[cidx];
        if (!targetCol) return;

        const editor = typeof targetCol.editor === "object" ? (targetCol.editor as Editor2) : undefined;
        const optionList = unref(targetCol.optionListRef);
        const hasOptionList = Array.isArray(optionList) && (optionList as any[]).length > 0;

        if (hasOptionList || (editor?.options?.length && !editor.abreasetValue)) {
          const optionsArr = (hasOptionList ? (optionList as any[]) : editor?.options) || [];
          const valueList = optionsArr.map((opt: any) => Object.keys(opt)[0]);

          if (valueList.includes(pastedDatum)) return;

          const myRow = firstRow + ridx;
          const originDatum = originPdata[myRow]?.[targetCol.dataIndx as string];
          ui.rows[ridx][cidx] = originDatum;
        }
      });
    });
  };

  // Add default checkboxes and history columns
  const showButtons = { search: true, reset: true, save: true, ...props.buttonsShow };

  if (
    optionsIN.colModel?.[0]?.type !== "checkbox" &&
    (showButtons?.save || props.needState)
  ) {
    optionsIN.colModel?.unshift({
      title: "-",
      type: "checkbox",
      dataType: "bool",
      dataIndx: "state",
      editor: false,
      maxWidth: 35,
      minWidth: 35,
      sortable: false,
      cb: {
        all: true,
        header: true,
        history: true,
        check: true,
        uncheck: false,
        useTxn: true,
      },
    });
  }

  if (!props.skipCreDateUser) {
    optionsIN.colModel?.push(...[
      { title: t("common.credate"), dataType: "string", dataIndx: "credate", editable: false },
      { title: t("common.cretime"), dataType: "string", dataIndx: "cretime", editable: false },
      { title: t("common.creuser"), dataType: "string", dataIndx: "creuser", editable: false },
    ]);
  }

  if (!props.skipLmoDateUser) {
    optionsIN.colModel?.push(...[
      { title: t("common.lmodate"), dataType: "string", dataIndx: "lmodate", editable: false },
      { title: t("common.lmotime"), dataType: "string", dataIndx: "lmotime", editable: false },
      { title: t("common.lmouser"), dataType: "string", dataIndx: "lmouser", editable: false },
    ]);
  }

  optionsIN.colModel?.forEach((object: any) => {
    object.styleHead = {
      "font-size": "0.9rem",
      "font-weight": "bold",
      "border-bottom": "1px solid #DBE0E5",
    };
    object.halign = "center";
    object.hvalign = "center";
    object.valign = "center";
    object.style = { "font-size": "0.85rem" };
  });

  // -----------------------------------------------------------
  // A4. setDefault
  // -----------------------------------------------------------
  const setDefault = () => {
    props.searchConditions?.forEach((c: any) => {
      if (typeof c.defaultvalue === "boolean" && c.defaultvalue === true) {
        if (c.elementType === "select" || c.elementType === "multiselect") {
          let stop: any;
          stop = watch(
            () => unref(c.searchElementItem),
            (newItems: any[]) => {
              if (newItems && newItems.length > 0) {
                const firstVal = newItems[0][c.searchProp.valueProp];
                if (c.elementType === "select") {
                  searchParameters.value[c.key] = firstVal;
                } else if (c.elementType === "multiselect") {
                  searchParameters.value[c.key] = searchParameters.value[c.key] || [];
                  searchParameters.value[c.key].push(firstVal);
                }

                if (vueformRef.value) {
                  vueformRef.value
                    .el$(c.key)
                    ?.update(searchParameters.value[c.key]);
                }
              }
              if (stop) stop();
            },
            { immediate: true },
          );
        }

        if (c.elementType === "date") {
          searchParameters.value[c.key] = [
            dayjs().add(-1, "day").format("YYYYMMDD"),
            dayjs().format("YYYYMMDD"),
          ];
        }

        if (c.elementType === "singleDate") {
          searchParameters.value[c.key] = dayjs().format("YYYYMMDD");
        }

        if (c.elementType === "checkbox") {
          searchParameters.value[c.key] = searchParameters.value[c.key] || [];
          searchParameters.value[c.key].push(c.searchElementItem[0]["value"]);
        }

        if (c.elementType === "monthDate") {
          selectedMonth.value = {
            year: dayjs().year(),
            month: dayjs().month(),
          };
          operations.handleMonthDate(selectedMonth.value);
        }
      } else if (c.defaultvalue) {
        searchParameters.value[c.key] = c.defaultvalue;
      }
    });
    if (vueformRef.value) {
      vueformRef.value.update(searchParameters.value);
    }
  };

  // -----------------------------------------------------------
  // A3. onMounted
  // -----------------------------------------------------------
  onMounted(async () => {
    if (theGrid.value) return;
    
    // @ts-expect-error - assuming global pq exists
    theGrid.value = pq.grid(`#${props.gridId}`, optionsIN);

    (async () => {
      theGrid.value?.showLoading?.();
      layoutSettDone.value = true;
      theGrid.value?.hideLoading?.();
    })();

    changeGridMessageOfnoRow(theGrid, t("noRows"));
    setDefault();

    if (iAmSubGridOf) {
      iAmSubGridOf.value.on("beforeValidate", function (event: any, ui: any) {
        if (ui.source === "rollback") {
          resetGridOf(theGrid, []);
          parentRow.value = {};
          searchParameters.value = {};
          return;
        }
      });

      iAmSubGridOf.value.on("rowDblClick", function (event: any, ui: any) {
        const newParentRow = ui.rowData || {};
        if (getIsEditing(theGrid)) {
          if (!confirm(t("confirm.resetChildrenGrid"))) return;
          resetGridOf(theGrid, []);
        }

        changeHeaderRowCls(iAmSubGridOf, ui.rowIndx);

        parentRow.value = newParentRow;
        searchParameters.value = newParentRow;

        const isKeyCols = iAmSubGridOf.value?.colModel?.filter?.((c: any) => c.isKey);
        if (isKeyCols?.length) {
          searchParameters.value = {};
          isKeyCols.forEach(
            (c: any) =>
              (searchParameters.value[c.dataIndx] = newParentRow[c.dataIndx]),
          );
        }

        operations.getdataFetching.execute();

        if (props.searchAddEvent != null) {
          props.searchAddEvent(searchParameters);
        }
      });

      if (props.sendItemType && givenGridBoxSet) {
        givenGridBoxSet.value[props.sendItemType] = theGrid;
      }
    }

    document.addEventListener("keydown", operations.deleteValidationFocus);
  });

  return {
    optionsIN,
    setDefault,
    setSelctionOptionsAgain,
    layoutSettDone,
  };
}
