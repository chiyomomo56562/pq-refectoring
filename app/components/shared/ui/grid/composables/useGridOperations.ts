import { ref, unref, watch, type Ref } from "vue";
import dayjs from "dayjs/esm/index.js";
import {
  getIsEditing,
  convertTheChangesToBodyParams,
  resetGridOf,
} from "../lib/grid.helpers";
import { getRowKey } from "../lib/grid.util";
import type {
  GridBoxSet,
  SearchList,
  MonthDate,
  GridChanges,
} from "../model/types/grid.types";

export function useGridOperations(options: {
  theGrid: Ref<any>;
  vueformRef: Ref<any>;
  parentRow: Ref<any>;
  searchParameters: Ref<any>;
  selectedMonth: Ref<MonthDate>;
  gridBoxSet: Ref<GridBoxSet>;
  props: any;
  emit: any;
  t: any;
}) {
  const {
    theGrid,
    vueformRef,
    parentRow,
    searchParameters,
    selectedMonth,
    gridBoxSet,
    props,
    emit,
    t,
  } = options;

  /**
   * 그리드 수정중 다시 조회할 경우 alert 띄우기
   */
  function confirmIsEditing(grid: Ref<any>, boxSet?: Ref<any>) {
    if (!getIsEditing(grid, boxSet)) return;
    if (confirm(t("confirm.gridIsEditing"))) return;
    return true;
  }

  /**
   * API Data Fetching declaration
   */
  const getdataFetching = useFetch(props.urlGet ?? props.url, {
    $fetch: (useNuxtApp() as any).$api,
    method: "GET",
    onRequest({ request, options }: any) {
      options.query = options?.query || {};
      options.query = {
        ...props.getInit,
        ...searchParameters.value,
        ...options.query,
      };
    },
    onResponse({ request, response, options }: any) {},
    immediate: false,
  });

  /**
   * Watch for status of data fetching
   */
  watch(getdataFetching.status, (newV) => {
    if (newV === "pending") theGrid.value?.showLoading?.();
    else theGrid.value?.hideLoading?.();

    if (newV === "success") {
      resetGridOf(
        theGrid,
        (getdataFetching.data.value as any[]).map((d) => {
          if (d.rowkey) return { ...d };
          return {
            rowkey: getRowKey(d, props.colModel),
            ...d,
          };
        }),
      );
    }
  });

  /**
   * 조회 시작
   */
  function searchStart(forced = false) {
    if (!forced) {
      if (confirmIsEditing(theGrid, gridBoxSet)) return;
    }
    // 조회용 api 호출
    getdataFetching.refresh();

    if (props.searchAddEvent != null) {
      props.searchAddEvent(searchParameters);
    }
  }

  /**
   * 조회 시작시 이벤트 (유효성 체크 후 시작)
   */
  function handleSearchClick(forced = false) {
    const requiredSearchList: Array<SearchList> =
      props.searchConditions?.filter((item: SearchList) => item.required) || [];

    const validCondition: Array<string> = [];
    if (requiredSearchList.length > 0) {
      for (const item of requiredSearchList) {
        let isValid: boolean = false;
        const element = unref(vueformRef).elements$[item.key];
        
        if (item.elementType === "date") {
          isValid = element.value.length === 0;
        } else if (item.elementType === "monthDate") {
          if (!selectedMonth.value) {
            isValid = true;
          } else if (!searchParameters.value[item.key]) {
            handleMonthDate(selectedMonth.value);
          }
        } else if (item.elementType === "multiselect") {
          isValid = element.value.length === 0;
        } else {
          isValid = !element.value;
        }

        if (isValid) {
          validCondition.push(item.label as string);
        }

        if (validCondition.length > 0) {
          return alert(
            t("selectRequiredCondition", { dataIndx: validCondition.join(",") }),
          );
        }
      }
    }

    if (props.onSearchStart) {
      props.onSearchStart();
    } else {
      searchStart(forced);
    }
  }

  /**
   * 검색조건 초기화
   */
  function searchReset() {
    parentRow.value = {};
    if (vueformRef.value) {
      vueformRef.value.reset();
      vueformRef.value.validate();
    }
  }

  /**
   * 컴포넌트 공통 저장기능 활용 전 colmodel에 설정한 validate 활용
   */
  function checkValidBeforeSave(gridRef: Ref<any>) {
    if (!gridRef.value) return null;

    const theChanges = unref(gridRef)?.getChanges?.({
      format: "byVal",
    }) as GridChanges;

    const addList = theChanges.addList.filter((a) => a.state);
    const updateList = theChanges.updateList.filter((u) => u.state);

    const res = {
      addLength: addList?.length || 0,
      updateLength: updateList?.length || 0,
      deleteLength: theChanges.deleteList?.length || 0,
    };

    const checkList = unref(gridRef).Checkbox("state")?.getCheckedNodes();
    if (checkList) {
      for (const checkRow of checkList) {
        const validMessages = unref(gridRef).isValid({
          rowIndx: checkRow.pq_ri,
          allowInvalid: false,
          focusInvalid: true,
        });
        if (!validMessages?.valid) {
          alert(
            t("validations.isInvalid", {
              rowspan: checkRow.pq_ri + 1,
              title: validMessages.column?.title,
            }) +
              validMessages?.msg +
              " ",
          );
          return null;
        }
      }
    }
    return res;
  }

  function setWatchUniqunessAll() {
    (props.extraUtil?.checkUniquenessOfParams || [])?.filter(
      (u: any) =>
        // @ts-expect-error - Assuming globally available useApiData
        useApiData(u.apiUrl || props.urlGet || props.url, u.apiParameters || {}),
    );
  }

  /**
   * url, posturl로 지정한 api 호출 (실제 POST)
   */
  async function postDataFetching() {
    theGrid.value?.showLoading?.();
    try {
      // @ts-expect-error - Nuxt specific
      await useNuxtApp().$api(props.urlPost ?? props.url + "/process", {
        method: "POST",
        body: convertTheChangesToBodyParams(theGrid, gridBoxSet),
        onResponse({ response, error }: any) {
          if (!response.ok) {
            if (response._data?.message) {
              alert(t(response._data?.message));
            } else {
              alert(t("fail.save"));
            }
            return;
          }
          if ((response?._data as number) > -1) {
            if (props.onlyInsertGrid) {
              resetGridOf(theGrid, []);
            } else {
              getdataFetching.refresh();
            }
            setWatchUniqunessAll();
          }
        },
      });
    } catch (error) {
      console.error(error);
    } finally {
      theGrid.value?.hideLoading?.();
    }
  }

  /**
   * 저장 시작
   */
  async function saveStart() {
    emit("send-data", convertTheChangesToBodyParams(theGrid, gridBoxSet));

    if (!getIsEditing(theGrid, gridBoxSet, true)) {
      alert(t("syncNo"));
      return;
    }

    let insertLength = 0;
    let updateLength = 0;
    let deleteLength = 0;

    if (gridBoxSet.value && Object.keys(gridBoxSet.value)?.length) {
      const checkValids = Object.entries(gridBoxSet.value).some(([key, grid]) => {
        const listlength = checkValidBeforeSave(grid as Ref<any>);
        if (!listlength) return true;
        insertLength += listlength.addLength;
        updateLength += listlength.updateLength;
        deleteLength += listlength.deleteLength;
        return false;
      });
      if (checkValids) return;
    } else {
      const listlength = checkValidBeforeSave(theGrid);
      if (!listlength) return;
      insertLength += listlength.addLength;
      updateLength += listlength.updateLength;
      deleteLength += listlength.deleteLength;
    }

    if (
      !confirm(
        t("confirm.saveGrid", {
          insertLength,
          updateLength,
          deleteLength,
        }),
      )
    )
      return;
    
    await postDataFetching();
  }

  /**
   * 월 선택 핸들러
   */
  function handleMonthDate(value: MonthDate) {
    if (!value) return;
    const month =
      (typeof value.month === "string" ? parseInt(value.month) : value.month) + 1;
    const year = value.year;
    const monthDateCol = props.searchConditions?.find(
      (c: any) => c.elementType === "monthDate",
    );
    if (!monthDateCol) return;
    const start = dayjs(`${year}${String(month).padStart(2, "0")}01`).format(
      "YYYYMMDD",
    );
    const end = dayjs(`${year}${String(month).padStart(2, "0")}01`)
      .endOf("month")
      .format("YYYYMMDD");
    searchParameters.value[monthDateCol.key] = [start, end];
  }

  /**
   * ESC 키로 검증 포커스 삭제
   */
  function deleteValidationFocus(event: KeyboardEvent) {
    const pqToolTip = document.querySelector(".ui-tooltip") as HTMLElement;
    if (pqToolTip && event.key === "Escape") {
      pqToolTip.remove();
      unref(theGrid).quitEditMode();
    }
  }

  return {
    getdataFetching,
    confirmIsEditing,
    searchStart,
    handleSearchClick,
    searchReset,
    checkValidBeforeSave,
    postDataFetching,
    saveStart,
    handleMonthDate,
    deleteValidationFocus,
    setWatchUniqunessAll,
  };
}
