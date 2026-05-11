<template>
  <div
    v-if="(searchConditions?.length ?? 0) > 0 && !iAmSubGridOf"
    class="search-top-wrapper"
  >
    {{ searchParameters }}
    <div v-if="!iAmSubGridOf">
      <div class="flex gap-1">
        <UButton
          v-if="buttons.search"
          :label="$t('bt.search')"
          class="btn-md btn-tertiary btn-icon"
          icon="i-mdi-magnify"
          @click="handleSearchClick()"
        />
        <UButton
          v-if="buttons.reset"
          class="btn-md btn-tertiary btn-icon"
          icon="i-heroicons-arrow-path-16-solid"
          @click="searchReset()"
        />
      </div>
      <Vueform
        ref="vueformRef"
        v-model="searchParameters"
        class="grid-form lg:mr-28"
        :display-errors="false"
        @mounted="vueformMounted"
        @reset="setDefault"
        @keydown.enter="handleSearchClick()"
      >
        <template v-for="search in searchConditions" :key="search.key">
          <SelectElement
            v-if="search.elementType == 'select' && search.searchElementItem"
            :name="search.key"
            :label="search.label"
            :placeholder="t('all')"
            :floating="false"
            :items="search.searchElementItem"
            :value-prop="search.searchProp?.valueProp"
            :label-prop="search.searchProp?.labelProp"
            :columns="SearchBarSizes"
            search
            :no-options-text="t('noOptions')"
            :append-to-body="true"
            :rules="search.required ? ['required'] : []"
            :display-errors="false"
          />
          <MultiselectElement
            v-else-if="
              search.elementType == 'multiselect' && search.searchElementItem
            "
            :native="false"
            :name="search.key"
            :label="search.label"
            :items="search.searchElementItem"
            :value-prop="search.searchProp.valueProp"
            :label-prop="search.searchProp.labelProp"
            :columns="SearchBarSizes"
            search
            :placeholder="t('all')"
            :close-on-select="false"
            :multiple-label="
              // @ts-expect-error
              (values) => `${values.map((v) => v?.[colm.editor._labelIndex])}`
            "
            :no-options-text="t('noOptions')"
            :hide-selected="false"
            :append-to-body="true"
            :rules="search.required ? ['required'] : []"
            :display-errors="false"
          />
          <DatesElement
            v-else-if="search.elementType == 'date'"
            mode="range"
            value-format="YYYYMMDD"
            :name="search.key"
            :label="search.label"
            :columns="SearchBarSizes"
            append-to-body
            :placeholder="t('all')"
            :max="search.dateOption?.maxDate || ''"
            :min="search.dateOption?.minDate || ''"
            :rules="search.required ? ['required'] : []"
            :display-errors="false"
          />
          <DateElement
            v-else-if="search.elementType == 'singleDate'"
            value-format="YYYYMMDD"
            :name="search.key"
            :label="search.label"
            :columns="SearchBarSizes"
            append-to-body
            :placeholder="t('all')"
            :max="search.dateOption?.maxDate || ''"
            :min="search.dateOption?.minDate || ''"
            search
            :rules="search.required ? ['required'] : []"
            :display-errors="false"
          />
          <StaticElement
            v-else-if="search.elementType == 'monthDate'"
            :name="search.key"
            :label="search.label"
            :columns="SearchBarSizes"
          >
            <VueDatePicker
              v-model="selectedMonth"
              month-picker
              auto-apply
              teleport="body"
              :locale="ko"
              :formats="{ input: 'yyyy-MM' }"
              :placeholder="t('all')"
              @update:model-value="handleMonthDate"
            />
          </StaticElement>
          <CheckboxgroupElement
            v-else-if="search.elementType == 'checkbox'"
            :name="search.key"
            :label="search.label"
            :items="search.searchElementItem"
            :columns="SearchBarSizes"
            :rules="search.required ? ['required'] : []"
            :display-errors="false"
            search
          />
          <RadiogroupElement
            v-else-if="search.elementType == 'radio'"
            :default="
              search?.searchElementItem //ColModel에서 설정한 아이템이 없으면 기본 radioElement사용
                ? Object.keys(search.searchElementItem)[0]
                : Object.keys(radioElement)[0]
            "
            :name="search.key"
            :label="search.label"
            :items="search.searchElementItem || radioElement"
            view="tabs"
            :columns="SearchBarSizes"
            :rules="search.required ? ['required'] : []"
            :display-errors="false"
            search
          />
          <ToggleElement
            v-else-if="search.elementType == 'toggle'"
            true-value="Y"
            false-value="N"
            default="Y"
            :name="search.key"
            :label="search.label"
            :labels="search?.searchElementItem"
            :columns="SearchBarSizes"
            :rules="search.required ? ['required'] : []"
            :display-errors="false"
            search
          />
          <TextElement
            v-else
            :name="search.key"
            :label="search.label"
            :columns="SearchBarSizes"
            :placeholder="t('all')"
            :rules="search.required ? ['required'] : []"
            :display-errors="false"
          />
        </template>
      </Vueform>
    </div>
  </div>

  <!-- 이게 그리드 -->
  <div class="grid-item shadow-none border-none rounded-none">
    <div v-show="props.gridTitle" class="grid-title">
      {{ props.gridTitle }}
    </div>
    <template v-if="buttons.save || $slots.extraButtons">
      <div
        :id="`${gridId}-custom-buttons`"
        class="mr-1 pq-toolbar-custom-buttons"
        style="height: auto"
        :class="props.gridTitle ? 'mt-16' : ''"
      >
        <div class="flex gap-x-1">
          <UButton
            v-if="buttons.save"
            :label="t('bt.save')"
            class="btn-sm btn-success-border btn-icon"
            icon="i-material-symbols-save-rounded"
            @click="saveStart()"
          />
          <slot name="extraButtons"></slot>
        </div>
      </div>
    </template>

    <div class="grid-inner !pb-0">
      <div :id="gridId" />
    </div>
  </div>
  <slot name="extraItemInput"></slot>
  <!-- 여기에 하위 children (하위 그리드 등) -->
  <slot />
</template>

<script lang="ts">
import dayjs from "dayjs/esm/index.js";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import pq from "pqgrid";
import "jquery-ui-pack";
import "pqgrid/localize/pq-localize-kr.js";
import { ko } from "date-fns/locale";

import {
  initRightClickMenu,
  initToolbarItems,
  dateEditor,
  timeEditor,
  getRowKey,
  customSelector,
  findRender,
} from "../lib/grid.util";

import {
  DefaultOptions,
  ClassHeadFromEditable,
  SearchBarSizes,
} from "../lib/grid.constants";

import {
  getIsEditing,
  editableNewOnly,
  whenChange,
  checkUniqueOnlyThisColumn,
  resetGridOf,
  convertTheChangesToBodyParams,
  changeGridMessageOfnoRow,
  changeHeaderRowCls,
} from "../lib/grid.helpers";

import type {
  SearchList,
  ColModel,
  MonthDate,
  Editor2,
  ExtraUtil,
  GridBoxSet,
  ToolbarItems,
  GridChanges,
} from "../model/types/grid.types";

import { loadLayoutSetting } from "../api/grid.api";

// ### ### ### ### END OF SCRIPT ### ### ### ###
</script>

<script lang="ts" setup>
// ### ### ### ### START OF SETUP SCRIPT ### ### ### ###
const theGrid = ref(); // pqgrid로 생성한 객체
const vueformRef = ref(); // vueform 객체
const parentRow = ref<any>({}); // 멀티그리드 화면에서 더블클릭한 headgrid의 row
const searchParameters = ref<any>({});
const { t } = useI18n();

// 기본 Radio 옵션
const radioElement = { "": t("useyn.all"), Y: t("useyn.y"), N: t("useyn.n") };

/**
 * 각 페이지에서 받아올 props
 */
const props = defineProps<{
  gridTitle?: string;
  gridId: string; // grid - id 필수, WARN: 유니크하게 해야 합니다!!!
  buttonsShow?: { search?: boolean; reset?: boolean; save?: boolean };
  options?: pq.gridT.options; // Omit<pq.gridT.options, "dataModel" | "colModel">; 그리드의 option, 공식 api문서 참조
  colModel: Array<pq.gridT.column & ColModel>;
  url: string;
  urlGet?: string;
  urlPost?: string;
  sendItemType?: "" | "head" | "item" | "sub";
  getInit?: object; // UseFetchType[1]; 조회시 기본으로 설정할 값
  toolbarItems?: ToolbarItems;
  skipCreDateUser?: boolean;
  skipLmoDateUser?: boolean;
  extraUtil?: ExtraUtil;
  onlyInsertGrid?: boolean; // insert만 하는 그리드 인지 확인
  onBeforeSave?: () => boolean | Promise<boolean>;
  needState?: boolean; // state컬럼 추가 여부 -> 따로 지정안할 경우 state 추가됨
  toolbarRemove?: boolean; // toolbarRemove == true 일경우 툴바 영역 삭제 및 버튼 표기 안함
  onSearchStart?: () => void; // 사용자 정의 조회 함수 (2025.06.17 김진우)
  searchAddEvent?: Function; // 일반적인 조회 후 실행할 이벤트( searchParameters도 같이 부모로 넘겨줌) -- 선택
  searchConditions?: Array<SearchList>; // 검색조건
}>();

/**
 * 부모 컴포넌트로 그리드 데이터를 보내기 위한 emit 정의
 */
const emit = defineEmits(["send-data", "before-save", "vueform-event"]);

/**
 * 각 화면에서 설정한 뷰폼 이벤트 설정
 */
function vueformMounted(el: any) {
  emit("vueform-event", el);
}

/**
 * 그리드 수정중 다시 조회할 경우 alert 띄우기
 */
function confirmIsEditing(theGrid: any, gridBoxSet?: any) {
  if (!getIsEditing(theGrid, gridBoxSet)) return; // 그리드에서 작성중인 데이터가 없으면 false
  if (confirm(t("confirm.gridIsEditing"))) return; // 작성중인 데이터가 있으면 confirm 후 true 반환
  return true;
}

/**
 * 조회 시작시 이벤트
 */
function handleSearchClick(forced = false) {
  // 필수 검색 항목이 있는지 확인
  const requiredSearchList: Array<SearchList> =
    props.searchConditions?.filter((item: SearchList) => item.required) || [];

  const validCondition: Array<string> = [];
  if (requiredSearchList.length > 0) {
    for (const item of requiredSearchList) {
      let isValid: boolean = false;
      const element = unref(vueformRef).elements$[item.key];
      // 1. 일자(range) 선택일때
      if (item.elementType === "date") {
        isValid = element.value.length === 0;
      } else if (item.elementType === "monthDate") {
        // 2. 월 선택일때
        if (!selectedMonth.value) {
          // selectMonth가 null일 경우엔 isValid true
          isValid = true;
        } else if (!searchParameters.value[item.key]) {
          // selectedMonth가 있는데 searchParameters에 값이 안 담겨있다면 세팅해주기
          handleMonthDate(selectedMonth.value);
        }
      } else if (item.elementType === "multiselect") {
        // 3. multiSelect일 때
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
    searchStart(forced); // 기존 함수 실행
  }
}

/**
 * 조회 시작
 */
function searchStart(forced = false) {
  if (!forced) {
    if (confirmIsEditing(theGrid, gridBoxSet)) return;
  }
  // 조회용 api호출
  getdataFetching.refresh();

  if (props.searchAddEvent != null) {
    // 추가적으로 호출할 함수가 있을경우 호출해줌
    props.searchAddEvent(searchParameters);
  }
}

/**
 * 검색조건 초기화
 */
function searchReset() {
  parentRow.value = {};
  vueformRef.value.reset();
  vueformRef.value.validate();
}

/**
 * 컴포넌트 공통 저장기능 활용 전 colmodel에 설정한 validate 활용
 */
function checkValidBeforeSave(theGrid: any) {
  if (!theGrid.value) return null;

  const theChanges = unref(theGrid)?.getChanges?.({
    format: "byVal",
  }) as GridChanges;
  // state가 true인 행만 대상으로 진행
  const addList = theChanges.addList.filter((a) => a.state);
  const updateList = theChanges.updateList.filter((u) => u.state);

  const res = {
    addLength: addList?.length || 0,
    updateLength: updateList?.length || 0,
    deleteLength: theChanges.deleteList?.length || 0,
  } as { addLength: number; updateLength: number; deleteLength: number };

  // unique확인 시 pq_ri를 확인하지 못하여 add, update 구분 없이 체크된 row전체를 가져와서 따로 확인
  const checkList = unref(theGrid).Checkbox("state")?.getCheckedNodes();
  // state 가 없는 그리드에서는 checkList가 없어 분기처리
  if (checkList) {
    for (const checkRow of checkList) {
      const validMessages = unref(theGrid).isValid({
        rowIndx: checkRow.pq_ri,
        allowInvalid: false,
        focusInvalid: true,
      });
      // validate 한번 하고
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

/**
 * url, posturl로 지정한 api 호출
 */
async function saveStart() {
  emit("send-data", convertTheChangesToBodyParams(theGrid, gridBoxSet));

  // 아무것도 변한 것이 없다면.
  if (!getIsEditing(theGrid, gridBoxSet, true)) {
    alert(t("syncNo"));
    return;
  }

  let insertLength = 0;
  let updateLength = 0;
  let deleteLength = 0;

  // valid check와 동시에 list length 계산
  if (gridBoxSet.value && Object.keys(gridBoxSet.value)?.length) {
    const checkValids = Object.entries(gridBoxSet.value).some((kv) => {
      const listlength = checkValidBeforeSave(kv[1]);
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

  // 컨펌 요청
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
  postDataFetching();
}

provide("iAmSubGridOf", theGrid); // 아이템 그리드에 헤드 그리드정보를 전파
const iAmSubGridOf: Ref<any> | undefined = inject("iAmSubGridOf", undefined); // provide로 들어온 iAmSubGridOf를 받거나 없는경우에는 undefined처리

const gridBoxSet = ref<GridBoxSet>({});
provide("gridBoxSet", gridBoxSet); // 헤더 그리드에서 gridBoxSet을 만들어 전파 -> head <-> item 양방향으로 사용하기 위해 inject 사용 x
// gridBoxSet에 head grid, itemGrid 등의 정보를 담음
if (props.sendItemType) {
  gridBoxSet.value[props.sendItemType] = theGrid;
}

// 컴포넌트 버튼
const buttons = { search: true, reset: true, save: true, ...props.buttonsShow };

// 집계 타이틀 -> 그리드 우클릭 -> 집계 클릭시 하단에 나오는 합계
const summaryTitle = {
  avg: `${t("summary.avg")} : {0}`, // 평균
  count: `${t("summary.count")} : {0}`, // 횟수
  max: `${t("summary.max")} : {0}`, // 최대
  min: `${t("summary.min")} : {0}`, // 최소
  sum: (obj: any) => obj.formatVal,
};

/**
 * colModel 컬럼별 기능 설정
 */
(props.colModel as Array<pq.gridT.column & ColModel>).forEach((c) => {
  // editable 로 head class 설정
  if (c.dataIndx !== "state") {
    if (c.editableNewOnly) {
      c.editable = editableNewOnly;
      c.clsHead = ClassHeadFromEditable["new-only"];
    } else if (
      c?.validations?.length &&
      c?.validations?.find((v) => v.type == "nonEmpty")
    ) {
      c.clsHead = ClassHeadFromEditable["nonEmpty"];
    } else if (c.editable) {
      c.clsHead = ClassHeadFromEditable["true"];
    } else {
      c.clsHead = ClassHeadFromEditable["false"];
    }
  }

  // type 관련
  if (c?.dataType == "integer") {
    c.editor = {
      select: true,
    }; // 정수 입력 cell에서는전체 값에 포커스
    if (!c.format) c.format = "#,###";
  } else if (c?.dataType == "float") {
    if (!c.format) c.format = "#,###.000";
    c.editor = {
      select: true,
    };
  } else if (c.type == "checkbox" && c?.dataType == "string") {
    // YN 체크박스 인경우
    if (!c?.cb)
      c.cb = {
        all: false,
        header: c?.editable ? true : false, // edit 못 하면 header에 표기 안함
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
      init: timeEditor, // 시간 컬럼에는 util.ts의 timeEditor적용
      getData: function (ui: any) {
        if (!ui.cellData) {
          ui.cellData = "000000"; // 초기에 00:00으로 하려할 경우 값을 넣지 않는걸로 인식하여 강제 변경
        }
        return ui.cellData;
      },
    };
    c.format = (val) => val?.replace(/(\d{2})(\d{2})(\d{2})/g, "$1:$2");
  } else if (c.dataType === "date") {
    c.dataType = "string";
    c.editor = {
      init: dateEditor, // 날짜 컬럼에는 util.ts의 dateEditor적용
      getData: function (ui: any) {
        return ui.cellData;
      },
      dateEditorOption:
        typeof c.editor === "object" ? c.editor?.dateEditorOption : {},
    };
    c.format = (val) =>
      val?.toString().replace(/(\d{4})(\d{2})(\d{2})/g, "$1-$2-$3"); // toString으로 변경하여 처리
  }

  // CheckUniquenessOf
  props.extraUtil?.checkUniquenessOfParams
    .filter((p) => p.targetCols.includes(c.dataIndx + ""))
    .forEach((p) => {
      if (!c?.validations?.length) c.validations = [];
      p.apiUrl = p.apiUrl || props.urlGet || props.url;
      const targetColLabels = p.targetCols
        .map(
          (cc) =>
            (props.colModel.find((ccc) => ccc.dataIndx == cc) || {}).title,
        )
        .join("+");
      if (iAmSubGridOf) {
        watch(
          () => searchParameters.value,
          (newV) => {
            p.apiParameters = newV;
          },
        );
      }
    });

  // validations
  if (c.validations?.length) {
    const theUnique = c.validations.find((v) => v.type == "unique");
    if (theUnique) {
      theUnique.type = checkUniqueOnlyThisColumn;
      if (!theUnique.msg) theUnique.msg = t("validations.unique");
    }
    c.validations.forEach((v) => {
      if (!v.msg && typeof v.type != "function") {
        v.msg = t(`validations.${v.type}`, { value: v?.value });
      }
      if (v.type != "function" && v.type != "nonEmpty") {
        switch (v.type) {
          case "minLen":
            v.type = function (ui: any) {
              if (ui.value && ui.value.toString().length < v?.value) {
                return false;
              }
            };
            break;
          case "maxLen":
            v.type = function (ui: any) {
              if (ui.value && ui.value.toString().length > v?.value) {
                return false;
              }
            };
            break;
          case "lt":
            v.type = function (ui: any) {
              if ((ui.value || ui.value === 0) && ui.value >= v?.value) {
                return false;
              }
            };
            break;
          case "gt":
            v.type = function (ui: any) {
              if ((ui.value || ui.value === 0) && ui.value <= v?.value) {
                return false;
              }
            };
            break;
          case "lte":
            v.type = function (ui: any) {
              if ((ui.value || ui.value === 0) && ui.value > v?.value) {
                return false;
              }
            };
            break;
          case "gte":
            v.type = function (ui: any) {
              if (ui.value && ui.value < v?.value) {
                return false;
              }
            };
            break;
          case "regexp":
            v.type = function (ui: any) {
              if (ui.value) {
                const regex = new RegExp(v?.value);
                const isValid = regex.test(ui.value);
                return isValid;
              }
            };
            break;
        }
      }
    });
  }

  // isParentKey
  if (c.isParentKey) {
    if (!c.init) c.init = ({ parentRow }) => parentRow?.[c.dataIndx] || "";
  }
  // grid multi select
  const columEditor = c.editor;
  if (typeof columEditor === "object") {
    if (columEditor?.type === "select" && columEditor?.multiSelect) {
      columEditor.init = customSelector;
      columEditor.getData = function (ui: any) {
        const gridObject = unref(theGrid);
        const rowData = ui.rowData;
        if (ui.cellData && Array.isArray(ui.cellData[ui.column.dataIndx])) {
          for (
            let idx = 1;
            idx < ui.cellData[ui.column.dataIndx].length;
            idx++
          ) {
            if (columEditor.abreasetValue) {
              return ui.cellData[ui.column.dataIndx].join(",");
            } else {
              const newRow = { ...rowData };
              if (newRow["rowkey"]) {
                newRow["rowkey"] = null;
              }
              newRow[ui.column.dataIndx] = ui.cellData[ui.column.dataIndx][idx];
              gridObject.addRow({
                newRow: newRow,
                checkEditable: false,
              });
            }
          }
          return ui.cellData[ui.column.dataIndx][0];
        }
      };
    } else if (columEditor.type === "select") {
      columEditor.init = customSelector;
      columEditor.getData = function (ui: any) {
        return ui.cellData;
      };
    }
    if (columEditor?.type != "select") return;
    columEditor.labelIndx = columEditor?.labelIndx || "label";
    columEditor.valueIndx = columEditor?.valueIndx || "value";
    columEditor._labelIndex = columEditor.labelIndx + "";
    columEditor._valueIndex = columEditor.valueIndx + "";
  }

  if (c.optionListRef && !c.render) c.render = SelectRenderer;
  if (!c.sortType && c.optionListRef) {
    c.sortType = (rowData1: any, rowData2: any, dataIndx: any) => {
      const origionRow = rowData1[dataIndx];
      const afterRow = rowData2[dataIndx];
      let originData = rowData1[dataIndx];
      let afterData = rowData2[dataIndx];

      let options =
        typeof columEditor === "object" ? columEditor.options || [] : [];
      if (typeof options == "function") {
        // @ts-expect-error
        options = editor._options;
      }
      if (options.length > 0) {
        const origionLabel =
          options?.find?.((o: any) => o[origionRow])?.[origionRow] || "";
        const afterLabel =
          options?.find?.((o: any) => o[afterRow])?.[afterRow] || "";
        originData = origionLabel;
        afterData = afterLabel;
      }
      if (originData > afterData) return 1;
      if (originData < afterData) return -1;
      if (originData === afterData) return 0;
      return 0;
    };
  }
});

// ==================================== 월 선택 관련 ====================================
const selectedMonth = ref<MonthDate>(
  (props.searchConditions?.find((c) => c.elementType === "monthDate")
    ?.defaultvalue as MonthDate) || null,
);

function handleMonthDate(value: MonthDate) {
  if (!value) return;
  const month =
    (typeof value.month === "string" ? parseInt(value.month) : value.month) + 1;
  const year = value.year;
  const monthDateCol = props.searchConditions?.find(
    (c) => c.elementType === "monthDate",
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
// ==============================================================

const _dataIndxList = props.colModel.map((c) => c.dataIndx);

props.extraUtil?.checkUniquenessOfParams
  .map((p) => p.targetCols)
  .forEach((targetCols) => {
    const notFoundCols = targetCols.filter((c) => !_dataIndxList.includes(c));
    if (!notFoundCols?.length) return;
  });

const watchesDynamicOptions = ref<any[]>([]);

props.colModel
  ?.filter((c) => isRef(c?.optionListRef) || c?.optionFilter)
  .forEach((c) => watchesDynamicOptions.value.push(c.optionListRef));

watchDebounced(
  () => watchesDynamicOptions.value,
  (newV) => {
    theGrid?.value?.showLoading();
    setSelctionOptionsAgain();
    theGrid?.value?.hideLoading();
  },
  { debounce: 500, deep: true },
);

const optionsIN: pq.gridT.options = {
  ...DefaultOptions,
  summaryTitle,
  toolbar: {
    cls: `${props.gridId}-pq-toolbar-search`,
    items:
      props.toolbarRemove == true
        ? []
        : initToolbarItems(props.toolbarItems, parentRow),
  },
  ...props.options,
};

optionsIN.toolbar = optionsIN.toolbar;
optionsIN.dataModel = optionsIN.dataModel || {};
optionsIN.dataModel.recIndx = optionsIN?.dataModel?.recIndx || "rowkey";
optionsIN.colModel = props.colModel;
optionsIN.columnTemplate =
  props.toolbarItems?.find !== false ? { render: findRender } : undefined;
optionsIN.beforeValidate = function (event: any, ui: any) {
  whenChange(event, ui, this, unref(parentRow));
};

optionsIN.beforePaste = function (evt: any, ui: any) {
  const firstCol = ui?.areas?.[0]?.firstC || ui?.areas?.[0]?.c1 || 0;
  const firstRow = ui?.areas?.[0]?.firstR || ui?.areas?.[0]?.r1 || 0;
  const originPdata = (this as any)?.pdata || [];

  const colModel = (optionsIN.colModel as ColModel[]) || [];
  const targetColumns = colModel.slice(
    firstCol,
    firstCol + (ui.rows?.[0]?.length || 0),
  );

  ui.rows.forEach((pastedRow: any[], ridx: number) => {
    pastedRow.forEach((pastedDatum: any, cidx: number) => {
      const targetCol = targetColumns[cidx];
      if (!targetCol) return;

      const editor =
        typeof targetCol.editor === "object"
          ? (targetCol.editor as Editor2)
          : undefined;
      const optionList = unref(targetCol.optionListRef);
      const hasOptionList =
        Array.isArray(optionList) && (optionList as any[]).length > 0;

      if (hasOptionList || (editor?.options?.length && !editor.abreasetValue)) {
        const options =
          (hasOptionList ? (optionList as any[]) : editor?.options) || [];
        const valueList = options.map((opt: any) => Object.keys(opt)[0]);

        if (valueList.includes(pastedDatum)) return;

        const myRow = firstRow + ridx;
        const originDatum = originPdata[myRow]?.[targetCol.dataIndx];

        ui.rows[ridx][cidx] = originDatum;
      }
    });
  });
};

if (
  optionsIN.colModel?.[0]?.type !== "checkbox" &&
  (buttons?.save || props.needState)
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
  optionsIN.colModel.push(
    ...[
      {
        title: t("common.credate"),
        dataType: "string",
        dataIndx: "credate",
        editable: false,
      },
      {
        title: t("common.cretime"),
        dataType: "string",
        dataIndx: "cretime",
        editable: false,
      },
      {
        title: t("common.creuser"),
        dataType: "string",
        dataIndx: "creuser",
        editable: false,
      },
    ],
  );
}

if (!props.skipLmoDateUser) {
  optionsIN.colModel.push(
    ...[
      {
        title: t("common.lmodate"),
        dataType: "string",
        dataIndx: "lmodate",
        editable: false,
      },
      {
        title: t("common.lmotime"),
        dataType: "string",
        dataIndx: "lmotime",
        editable: false,
      },
      {
        title: t("common.lmouser"),
        dataType: "string",
        dataIndx: "lmouser",
        editable: false,
      },
    ],
  );
}

optionsIN.colModel.forEach((object) => {
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

function deleteValidationFocus(event: KeyboardEvent) {
  const pqToolTip = document.querySelector(".ui-tooltip") as HTMLElement;
  if (pqToolTip && event.key === "Escape") {
    pqToolTip.remove();
    unref(theGrid).quitEditMode();
  }
}

function SelectRenderer(ui: pq.gridT.renderObj) {
  const cellData = ui?.cellData;
  const editor = ui?.column?.editor as Editor2;
  let options = editor?.options || [];
  if (typeof options == "function") {
    options = editor._options;
  }

  if (!options || !options.length) {
    const targetOriginCol = props.colModel.find(
      (c) => c.dataIndx == ui.dataIndx,
    );
    const optionListRef = targetOriginCol?.optionListRef;
    if (optionListRef) {
      const targetC = theGrid.value.colModel.find(
        (c: any) => c.dataIndx == ui.dataIndx,
      );
      options =
        targetC?.editor?.options || targetOriginCol?.editor?.options || [];
    }
  }

  const label = options?.find?.((o) => o[cellData])?.[cellData];
  if (!label) {
    if (!cellData) return cellData;
  }
  const findRules = theGrid.value.options.findRules || [];
  if (props.toolbarItems?.find !== false && findRules.length > 0) {
    let indx = -1;
    for (const findRule of findRules) {
      const txt = findRule.value?.toUpperCase();
      indx = label?.toUpperCase().indexOf(txt);
      if (ui.dataIndx === findRule.dataIndx) {
        if (indx >= 0) {
          const txt1 = label.substring(0, indx);
          const txt2 = label.substring(indx, indx + txt.length);
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

const layoutSettDone = ref(false);

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

function makeEditorInColM(c: pq.gridT.column & ColModel) {
  if (!c.optionListRef) return;
  const colsOrigin = optionsIN.colModel?.find(
    (cc) => cc.dataIndx == c.dataIndx,
  ) as ColModel;
  if (!c.editor || typeof c.editor === "boolean") c.editor = {};

  const columnEditor = c.editor as Editor2;
  if (c.optionListRef) {
    if (
      // @ts-expect-error
      unref(c.optionListRef)?.length !=
      (unref(colsOrigin?.optionListRef || []) as any).length
    ) {
      c.optionListRef = colsOrigin?.optionListRef;
    }
    // @ts-expect-error
    if (c.optionListRef?.provide) columnEditor.options = [];
    else columnEditor.options = unref(c.optionListRef) as any[];
  }
  if (typeof c.editor.labelMapFunction == "function") {
    const labelMapFunction = c.editor.labelMapFunction;
    columnEditor.options = columnEditor.options?.map(labelMapFunction);
  }

  columnEditor.options = (columnEditor?.options || []).map((e) => ({
    [e?.[columnEditor?._valueIndex || ""]]:
      e?.[columnEditor?._labelIndex || ""],
  }));
  // @ts-expect-error
  columnEditor._options = columnEditor.options;
  if (c.optionFilter) {
    // @ts-expect-error
    c.editor.options = (ui: pq.gridT.renderObj) =>
      // @ts-expect-error
      c.optionFilter(ui, theGrid, parentRow).map((e) => ({
        [e?.[columnEditor?._valueIndex || ""]]:
          e?.[columnEditor?._labelIndex || ""],
      }));
  }

  const originTarget = optionsIN.colModel?.find(
    (cc) => cc.dataIndx == c.dataIndx,
  );
  if (originTarget) originTarget.editor = columnEditor;
}

const setDefault = () => {
  props.searchConditions?.forEach((c) => {
    if (typeof c.defaultvalue === "boolean" && c.defaultvalue === true) {
      if (c.elementType === "select" || c.elementType === "multiselect") {
        let stop: any;
        // eslint-disable-next-line prefer-const
        stop = watch(
          () => unref(c.searchElementItem),
          (newItems) => {
            if (newItems.length > 0) {
              const firstVal = newItems[0][c.searchProp.valueProp];
              if (c.elementType === "select") {
                searchParameters.value[c.key] = firstVal;
              } else if (c.elementType === "multiselect") {
                searchParameters.value[c.key].push(firstVal);
              }

              if (vueformRef.value) {
                vueformRef.value
                  .el$(c.key)
                  ?.update(searchParameters.value[c.key]);
              }
            }
            if (stop) {
              stop();
            }
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
        searchParameters.value[c.key].push(c.searchElementItem[0]["value"]);
      }

      if (c.elementType === "monthDate") {
        selectedMonth.value = {
          year: dayjs().year(),
          month: dayjs().month(),
        };
        handleMonthDate(selectedMonth.value);
      }
    } else if (c.defaultvalue) {
      searchParameters.value[c.key] = c.defaultvalue;
    }
  });
  if (vueformRef.value) {
    vueformRef.value.update(searchParameters.value);
  }
};

onMounted(async () => {
  if (theGrid.value) return;
  theGrid.value = pq.grid(`#${props.gridId}`, optionsIN);

  (async () => {
    theGrid.value?.showLoading?.();
    layoutSettDone.value = true;
    theGrid.value?.hideLoading?.();
  })();

  changeGridMessageOfnoRow(theGrid, t("noRows"));
  setDefault();

  if (iAmSubGridOf) {
    if (iAmSubGridOf) {
      // @ts-expect-error
      iAmSubGridOf.value.on("beforeValidate", function (event: any, ui: any) {
        if (ui.source === "rollback") {
          resetGridOf(theGrid, []);
          parentRow.value = {};
          searchParameters.value = {};
          return;
        }
      });
    }

    // @ts-expect-error
    iAmSubGridOf.value.on("rowDblClick", function (event: any, ui: any) {
      const newParentRow = ui.rowData || {};
      if (getIsEditing(theGrid)) {
        if (!confirm(t("confirm.resetChildrenGrid"))) return;
        resetGridOf(theGrid, []);
      }

      changeHeaderRowCls(iAmSubGridOf, ui.rowIndx);

      parentRow.value = newParentRow;
      searchParameters.value = newParentRow;
      // @ts-expect-error
      const isKeyCols = iAmSubGridOf.value?.colModel?.filter?.((c) => c.isKey);
      if (isKeyCols?.length) {
        searchParameters.value = {};
        isKeyCols.forEach(
          (c: any) =>
            (searchParameters.value[c.dataIndx] = newParentRow[c.dataIndx]),
        );
      }

      getdataFetching.execute();

      if (props.searchAddEvent != null) {
        props.searchAddEvent(searchParameters);
      }
    });

    if (props.sendItemType) {
      if (!givenGridBoxSet) return;
      givenGridBoxSet.value[props.sendItemType] = theGrid;
    }
  }
  document.addEventListener("keydown", deleteValidationFocus);
});

defineExpose({
  theGrid,
  searchStart,
  saveStart,
  searchReset,
  checkValidBeforeSave,
});

const getdataFetching = await useAPIFetch(props.urlGet ?? props.url, {
  method: "GET",
  onRequest({ request, options }) {
    options.query = options?.query || {};
    options.query = {
      ...props.getInit,
      ...searchParameters.value,
      ...options.query,
    };
  },
  onResponse({ request, response, options }) {},
  immediate: false,
});

async function postDataFetching() {
  theGrid.value?.showLoading?.();
  try {
    await useNuxtApp().$api(props.urlPost ?? props.url + "/process", {
      method: "POST",
      body: convertTheChangesToBodyParams(theGrid, gridBoxSet),
      onResponse({ response, error }) {
        if (!response.ok) {
          if (response._data.message != "") {
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
    console.log(error);
  } finally {
    theGrid.value?.hideLoading?.();
  }
}

function setWatchUniqunessAll() {
  (props.extraUtil?.checkUniquenessOfParams || [])?.filter(
    (u) =>
      useApiData(u.apiUrl || props.urlGet || props.url, u.apiParameters || {}),
  );
}

watch(getdataFetching.status, (newV) => {
  if (newV == "pending") theGrid.value?.showLoading?.();
  else theGrid.value?.hideLoading?.();
  if (newV == "success") {
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

const givenGridBoxSet: Ref<GridBoxSet> | undefined = inject(
  "gridBoxSet",
  undefined,
);
</script>

<style>
@import "jquery-ui-pack/jquery-ui.structure.css";
@import "jquery-ui-pack/jquery-ui.theme.css";
@import "pqgrid/pqgrid.min.css";
@import "pqgrid/pqgrid.ui.min.css";
@import "pqgrid/themes/bootstrap/pqgrid.css";
</style>
