// @ts-nocheck
import { createApp, h, ref, onMounted, nextTick } from "vue";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import { ko } from "date-fns/locale";
import CustomSelectElement from "../ui/CustomSelectElement.vue";
import vueform from "@vueform/vueform";
import dayjs from "dayjs/esm";

/**
 * 시간 선택 셀 에디터 (VueDatePicker 마운트)
 */
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

/**
 * 날짜 선택 셀 에디터 (VueDatePicker 마운트)
 */
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

/**
 * 커스텀 선택 컴포넌트 셀 에디터
 */
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
