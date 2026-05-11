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
  <!-- <div v-if="$slots.extraInputElements" class="search-top-wrapper">
    <div class="search-top-inner">
      <slot name="extraInputElements"></slot>
    </div>
  </div> -->

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
// 한번만 실행 script
import pq from "pqgrid";
import "jquery-ui-pack";
import "pqgrid/localize/pq-localize-kr.js";

// CSS 임포트는 <style> 블록이나 nuxt.config.ts로 이동하여 렌더링 차단을 방지합니다.

import {
  initRightClickMenu,
  initToolbarItems,
  dateEditor,
  timeEditor,
  getRowKey,
  customSelector,
  findRender,
} from "./util";

import { ko } from "date-fns/locale";
// ### ### ### ### END OF SCRIPT ### ### ### ###

/**
 * 그리드 생성시 기본으로 세팅할 option
 */
const DefaultOptions: pq.gridT.options = Object.freeze({
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
 * 검색영역 설정을 위한 props
 * DTO를 그대로 가져와서 import도 가능하니깐 그걸 바로 가져와서 연동도 가능하다
 * 검색영역 기반
 */
interface SearchListBase {
  key: string;
  label: string;
  required?: boolean;
  defaultvalue?: string | boolean | string[] | MonthDate;
}

/**
 * 검색영역 타입이 셀렉트박스나 멀티셀렉트인 경우
 */
interface SearchListSelect extends SearchListBase {
  elementType: "select" | "multiselect";
  searchElementItem: any;
  searchProp: {
    valueProp: string;
    labelProp: string;
  };
}

/**
 * 검색영역이 날짜인경우
 */
interface SearchListDate extends SearchListBase {
  elementType: "date" | "singleDate" | "monthDate";
  dateOption?: { maxDate?: Date; minDate?: Date };
}

/**
 * 그 외 검색영역
 */
interface SearchListNonSelect extends SearchListBase {
  elementType?: "checkbox" | "toggle" | "radio";
  searchElementItem?: any;
  searchProp?: never;
}

/**
 * 위의 searchlist관련 속성 통합, 각 페이지에서는 이걸 import 하여서 사용
 */
export type SearchList =
  | SearchListSelect
  | SearchListDate
  | SearchListNonSelect;

/**
 * ColModel
 */
export interface ColModel extends pq.gridT.column {
  dataIndx: string | number;
  dataType:
    | "bool"
    | "float"
    | "html"
    | "integer"
    | "double"
    | "string"
    | "stringi"
    | "time"
    | "date";
  editor?: // editor를 false로 설정할 수 도 있음
    Editor2 | boolean;
  // | ((ui: pq.gridT.cellObject) => pq.gridT.editorObj);
  title: string | ((ui: pq.gridT.renderObj) => string);
  init?: string | number | InitFunction; // Function; // new row 할때의 초기값
  validations?: Array<{
    icon?: string;
    type:
      | "minLen"
      | "maxLen"
      | "gt"
      | "gte"
      | "lt"
      | "lte"
      | "nonEmpty"
      | "regexp"
      | "neq"
      | "unique" // Custom 속성 모든 row column 감지하여 유니크네스 획득
      | Function;
    // TODO valid function {column, value, rowData, msg}
    value?: any;
    msg?: string; // | ((ui: any) => string);
    warn?: boolean;
  }>; // pq.gridT.col ;
  editable?: boolean | ((ui: any) => boolean);
  editableNewOnly?: boolean; // new-only : 새로 생성시에만 바꿀 수 있음. 등록 이후는 고정됨.
  onChangeMake?: {
    // type?: "add" | "update" | "all"; //addList, updateList, all(add, update 전체 적용) 구분
    target: string;
    value: string | InitFunction;
  }[];
  optionListRef?: Ref<Array<unknown> | unknown>; // 셀렉트 박스에 들어가야 하는 option 목록
  // Array<any> | Ref<Array<any>>; // option list get 하는 url
  optionFilter?: OptionFilter; // Function; // return type은 반드시 array 여야합니다
  isKey?: boolean; // 해당 컬럼을 before 컬럼화 합니다.
  isParentKey?: boolean; // 여부 : 해당 컬럼은 parent에서 valid해야 children grid에 정보를 불러오기/넣기 할 수 있습니다.
  // 즉 children 의 colModel 에 넣으세요!!
}

/**
 * TODO 어떤 함수인지 설명 필요. 필요 없는 함수라면 과감하게 정리할 것.
 */
export interface MonthDate {
  month: string | number;
  year: string | number;
}

/**
 * 그리드 셀렉트박스에서 보여줄 label을 직접 설정
 */
export type LabelMapFunction = (oneOptionObject: any) => any;

/**
 * pqgrid colmodel의 customize
 */
export interface Editor2 extends pq.gridT.editorObj {
  labelMapFunction?: LabelMapFunction;
  _labelIndex?: string;
  _valueIndex?: string;
  multiSelect?: boolean;
  abreasetValue?: boolean;
  dateEditorOption?: DateEditorOptionOrFactory; // date editor 옵션
}

/**
 * DateEditor에 props를 넘기기위한 추가 옵션
 */
export interface DateEditorOption {
  maxDate?: string | Date | Function;
  minDate?: string | Date | Function;
}

/**
 * DateEditorOption을 function형식으로도 넘길수 있도록 추가
 */
type DateEditorOptionOrFactory =
  | DateEditorOption
  | ((ui: any) => DateEditorOption);

/**
 * 특정 조건에 따라 변경되는 컬럼의 optionList
 */
export type OptionFilter = (
  ui: pq.gridT.renderObj,
  theGrid: any,
  parentRowRef?: Ref<any>,
) => any[];

/**
 * pqgrid의 행을 추가할때 실행할 function
 */
export type InitFunction = (params: {
  pqgridData: any; // pq.gridT.da,
  colModels: Array<pq.gridT.column & ColModel>;
  thisColModel: pq.gridT.column & ColModel;
  newRow?: any;
  parentRow?: any;
  currentRow?: any; // 현재 Row를 따로 구분하기 위해 추가
}) => any;

/**
 * pqgrid의 unique를 확인하기 위한 param
 */
export interface CheckUniquenessOfParameter {
  apiUrl?: string;
  targetCols: string[];
  apiParameters?: any; // {}
  itemRefData?: any; // 아이템그리드에서 apiParameters변경시 apiUrl 데이터를 조회하도록 설정
}

/**
 * pqgrid의 unique를 확인하기 위한 param
 */
export type CheckUniquenessOf = (
  parameters: CheckUniquenessOfParameter,
) => Promise<boolean>;

/**
 * props에서 전달할 부가적인 기능
 */
export interface ExtraUtil {
  checkUniquenessOfParams: CheckUniquenessOfParameter[];
}

/**
 * 그리드의 데이터 목록
 */
export type GridBoxSet = {
  head?: any;
  item?: any;
  sub?: any;
};

/**
 * 그리드이 toolbar
 */
export interface ToolbarItems {
  find?: boolean;
  add?: boolean;
  reset?: boolean;
  delete?: boolean;
  save?: boolean;
}

/**
 * editable 여부에 따라서 변경되는 그리드 헤더의 배경색상 클래스
 * 추후 수정될 예정
 */
const ClassHeadFromEditable = {
  true: "bg-[#FFF9E6]", // 수정가능 연한 노란색으로 변경
  false: "bg-[#ECF1F9]", // 수정불가능
  nonEmpty: "bg-[#EFFCF2]", // 필수
  "new-only": "bg-[#EFFCF2]", // 첫등록때만 입력가능
  "row-highlight": "bg-[#ECF1F9]", // 선택됨
};

/*
 * 검색영역의 크기 조절
 */
const SearchBarSizes = {
  default: { container: 12, label: 4, wrapper: 12 },
  xs: { container: 12, label: 4, wrapper: 12 },
  sm: { container: 12, label: 4, wrapper: 12 },
  md: { container: 6, label: 4, wrapper: 12 },
  lg: { container: 4, label: 4, wrapper: 12 },
  xl: { container: 4, label: 4, wrapper: 12 },
};

// 그리드의 변경목록
export type GridChanges = {
  addList: any[];
  updateList: any[];
  oldList: any[];
  deleteList: any[];
};

/*
 * grid row 중 실질적으로 editing이 있는지 확인 : true/false
 */
function getIsEditing(
  theGrid: any,
  gridBoxSet?: Ref<GridBoxSet>,
  onlySelectedState = false,
) {
  // 변경한 목록이 있는지 확인하는 함수
  const thisGridIsEditing = (_theGrid: any) => {
    // 변경한 목록을 모두 가져옴
    const theChanges = unref(_theGrid)?.getChanges?.({
      format: "byVal",
      all: true,
    }) as GridChanges;
    if (!theChanges) return false;

    // 변경하기 전 목록과 비교해서 변경내역이 state 하나인것만 있는지 확인
    const onlyStateChanges = theChanges.oldList.filter((oldRow) => {
      const keys = Object.keys(oldRow);
      return keys.length === 1 && keys.includes("state");
    });

    // 변경한 값이 state하나인 경우 false 반환
    if (
      !onlySelectedState &&
      theChanges.updateList.length > 0 &&
      onlyStateChanges.length > 0 &&
      onlyStateChanges.length === theChanges.updateList.length &&
      theChanges.addList.length === 0
    ) {
      return false;
    }

    // 아니라면 state가 true인 항목이 하나라도 있다면 true 반환
    return Object.values(theChanges).some(
      (list) =>
        Array.isArray(list) && list.filter((item) => item.state).length > 0,
    );
  };
  // thisGridIsEditing End

  // 뭐가 들어있을 진 모르겠지만 하여간 3개 있는 것 다 시도.
  if (gridBoxSet?.value && Object.keys(gridBoxSet.value)?.length) {
    const headEditing = gridBoxSet.value.head
      ? thisGridIsEditing(gridBoxSet.value.head)
      : false;
    const itemEditing = gridBoxSet.value.item
      ? thisGridIsEditing(gridBoxSet.value.item)
      : false;
    const subEditing = gridBoxSet.value.sub
      ? thisGridIsEditing(gridBoxSet.value.sub)
      : false;

    return headEditing || itemEditing || subEditing;
  } else {
    return thisGridIsEditing(theGrid);
  }
}

/**
 * rowkey가 존재하지 않는 경우에만 편집가능
 */
function editableNewOnly(ui: pq.gridT.renderObj) {
  return !ui?.rowData?.rowkey;
}

/**
 *
 * 그리드의 'change' 이벤트는 해당 이벤트로 등록되어있음
 */
function whenChange(event: any, ui: any, self: any, parentRow = {}) {
  if (ui.source === "rollback") return; // 초기화 이벤트에는 실행 X
  const colModels = self?.colModel || []; // colModel 배열 가져오기
  const atUpdateOrAdd = async (u: any, whenChangeType: "update" | "add") => {
    const targetRow = u.newRow;
    if (!targetRow) return; // 새로 입력되거나 추가된 데이터가 없으면 종료

    // state를 따로 체크하지 않았다면 true로 업데이트
    if (
      !Object.prototype.hasOwnProperty.call(targetRow, "state") &&
      colModels.find((c: any) => c.dataIndx === "state") // state를 찾아서 true로 설정
    ) {
      // self.updateRow({
      //   rowIndx: u.rowIndx,
      //   newRow: { state: true },
      // });
      u.newRow.state = true;
    }

    // 추가 시, 행 상태를 true로 설정
    if (whenChangeType === "add") {
      // targetRow.state = true;
      // 비동기 init 메서드 실행 및 처리
      const initResults = await Promise.all(
        // 각 컬럼의 초기값(dataIndx, value)을 포함한 프로미스배열
        colModels.map(async (c: any) => {
          if (c?.init) {
            // 각 컬럼의 init으로 설정한 값 반영
            if (typeof c.init === "function") {
              // 함수인경우 비동기 호출
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
              // c.init이 함수가 아닐 때 직접 할당
              return { index: c.dataIndx, value: c.init };
            }
          }
          return null;
        }),
      );

      // init 결과 반영
      initResults.forEach((result) => {
        if (result && result.value != null) {
          // u.newRow[result.index] = result.value;
          self.updateRow({
            rowIndx: u.newRow.pq_ri,
            newRow: {
              [result.index]: result.value,
            },
            checkEditable: false,
          });
        }
      });
      // self.refreshView();

      // 모든 컬럼 모델에 대해 반복
      colModels.forEach((c: any) => {
        if (!c) return;
        if (
          // onChangeMake 로직이 있고, 해당 컬럼에 대한 값이 정의되어 있는 경우 실행
          c.onChangeMake &&
          targetRow[c.dataIndx] !== undefined &&
          targetRow[c.dataIndx] !== null
        ) {
          c.onChangeMake.forEach((ocm: any) => {
            // toValue 계산, 함수 또는 고정 값
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

            // 추가 상황에서 결과를 행에 설정
            self?.updateRow?.({
              rowIndx: u.newRow.pq_ri,
              newRow: {
                [ocm.target]: toValue,
              },
              checkEditable: false,
            });
            // u.newRow[ocm.target] = toValue;
            // 업데이트 상황에서 해당 컬럼을 업데이트
            // const column = colModels.find(
            //   (obj: any) => obj["dataIndx"] === ocm.target,
            // );
            // self?.updateRow?.({
            //   rowIndx: u.rowIndx,
            //   newRow: {
            //     [ocm.target]: toValue,
            //   },
            //   checkEditable: false,
            // });
            // 원래의 유효성 검사 배열 복원
          });
        }
      });
    } else {
      // add 벗어나서 onChangeMake 작동
      // 모든 컬럼 모델에 대해 반복
      colModels.forEach((c: any) => {
        if (!c) return;
        if (
          // onChangeMake 로직이 있고, 해당 컬럼에 대한 값이 정의되어 있는 경우 실행
          c.onChangeMake &&
          targetRow[c.dataIndx] !== undefined // !== null 조건 제외
        ) {
          c.onChangeMake.forEach((ocm: any) => {
            // toValue 계산, 함수 또는 고정 값
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

            // 추가 상황에서 결과를 행에 설정

            // 업데이트 상황에서 해당 컬럼을 업데이트
            // const column = colModels.find(
            //   (obj: any) => obj["dataIndx"] === ocm.target,
            // );
            // self?.updateRow?.({
            //   rowIndx: u.rowIndx,
            //   newRow: {
            //     [ocm.target]: toValue,
            //   },
            //   checkEditable: false,
            // });
            u.newRow[ocm.target] = toValue;
          });
        }
      });
    }

    // 화면 갱신
    // self.refreshView(); // 성능이슈로 주석처리
  };

  // 모든 업데이트 및 추가 이벤트에 대한 처리
  ui.updateList.forEach((u: any) => atUpdateOrAdd(u, "update"));
  ui.addList.forEach((u: any) => atUpdateOrAdd(u, "add"));
}

/**
 * recIndx로 설정될 rowkey를 생성하는 function
 */

/**
 * 컬럼의 데이터가 유일한 데이터인지 확인
 */
function checkUniqueOnlyThisColumn(ui: any) {
  // : pq.gridT.renderObj) {
  const theData = ui?.value || "";
  const dataIndx = ui?.column?.dataIndx || "";
  // @ts-expect-error
  if (!this) return;
  // @ts-expect-error
  const pdata: any[] = this?.pdata || [];
  return pdata.find(
    (p) => p?.pq_ri !== ui?.rowData?.pq_ri && p?.[dataIndx] == theData,
  )
    ? false
    : true;
}

/**
 * 조회한 데이터 그리드에 세팅
 * for Sub / Header grids
 * @param theGrid
 * @param anyData
 */
function resetGridOf(theGrid: any, anyData: any[]) {
  unref(theGrid)?.option?.("dataModel", {
    data: anyData,
    recIndx: "rowkey",
  });
  theGrid.value?.refreshDataAndView?.();
}

/**
 * 컴포넌트 공동 post 기능에 사용할 res 생성
 */
function convertTheChangesToBodyParams(
  theGrid: any,
  gridBoxSet?: Ref<GridBoxSet>,
) {
  // 공통화
  const changesToRes = (_theGrid: any) => {
    const theChanges = unref(_theGrid)?.getChanges?.({
      format: "byVal",
    }) as GridChanges;

    const res = {
      insert: theChanges.addList.filter((a) => a.state),
      update: theChanges.updateList.filter((u) => u.state),
      delete: theChanges.deleteList,
    };

    // before Columns 추가
    const keyCols = unref(_theGrid).colModel.filter((c: any) => c.isKey);
    if (keyCols?.length) {
      res.update.forEach((u: any, uidx: number) => {
        keyCols.forEach((c: any) => {
          const colName = c.dataIndx + "";
          const beforeColumnName =
            "before" + colName.charAt(0).toUpperCase() + colName.slice(1);
          const oldVal = theChanges?.oldList?.[uidx]?.[colName];
          u[beforeColumnName] = oldVal; // ?? u[colName];
        });
      });
    }

    return res;
  };

  let res: any = {}; // changesToRes(theGrid);

  // 뭐가 들어있을 진 모르겠지만 하여간 3개 있는 것 다 시도.
  // multi grid인 경우 head, item 구분
  if (gridBoxSet?.value && Object.keys(gridBoxSet.value)?.length) {
    Object.entries(gridBoxSet.value).forEach((kv) => {
      res[kv[0]] = changesToRes(kv[1]);
    });
  } else {
    res = changesToRes(theGrid);
  }
  return res;
}

/**
 *행이 없을때 메시지 수정
 */
function changeGridMessageOfnoRow(theGrid: any, targetMsg: string) {
  if (!theGrid?.value?.$cont) return;

  theGrid.value.$cont.find?.(".pq-grid-norows")?.text?.(targetMsg); // || t('noRows'))
}

/**
 * editable 여부에 따라 컬럼 헤더 색상 변경
 */
function changeHeaderRowCls(theParentGrid: any, rowIndx: number = 0) {
  if (!theParentGrid) return;
  const cls = ClassHeadFromEditable["row-highlight"];
  // 우선 전부 cls 붙은거 리셋
  unref(theParentGrid)
    .getRowsByClass({ cls })
    .forEach((res: any) =>
      unref(theParentGrid).removeClass({ rowIndx: res.rowIndx, cls }),
    );
  unref(theParentGrid).addClass({ rowIndx, cls });
}

// db에 담긴 그리드 레이아웃을 가져온다
export async function loadLayoutSetting(
  gridId: string,
  colModel: ColModel[],
  option: pq.gridT.options,
) {
  const nuxtApp = useNuxtApp();
  const $api = nuxtApp.$api;
  const res: any = await $api("/user/grid-layout", {
    params: { pgridid: gridId },
  });
  if (!res || res?.pgridid != gridId) {
    return option;
  }
  // 정상적으로 반환할 옵션
  const returnOption: pq.gridT.options = { ...option };
  const originalColModel = colModel || []; // 각 화면에서 설정한 ColModel
  const newColModelSomeData = JSON.parse(res?.colmset || "[{}]"); // db에 저장된 ColModel

  newColModelSomeData.forEach((c: any) => {
    const orig = originalColModel.find((o: any) => o.dataIndx === c.dataIndx);
    if (orig) {
      delete c.clsHead;
      // orig 객체에만 c의 속성들을 덮어씌운다.
      Object.assign(orig, c);
    }
  });

  // 순서 반영용: originalColModel 배열 자체를 새 순서로 정렬
  originalColModel.sort((a: any, b: any) => {
    const idxA = newColModelSomeData.findIndex(
      (c: any) => c.dataIndx === a.dataIndx,
    );
    const idxB = newColModelSomeData.findIndex(
      (c: any) => c.dataIndx === b.dataIndx,
    );

    const safeIdxA = idxA === -1 ? originalColModel.indexOf(a) : idxA;
    const safeIdxB = idxB === -1 ? originalColModel.indexOf(b) : idxB;

    return safeIdxA - safeIdxB;
  });

  // 새 ColModel로 덮어씌움
  returnOption.colModel = originalColModel;

  // grid의 options : 덮어쓰기
  const gridSettings = JSON.parse(res?.gridset || "{}");

  Object.entries(gridSettings).forEach(([okey, oval]: [string, any]) => {
    // groupModel 표시여부도 반영
    if (oval.groupModel) {
      if (oval.groupModel.on) {
        returnOption.groupModel = { ...returnOption.groupModel, on: true };
      }
      // okey가 숫자인 경우
    } else {
      (returnOption as any)[okey] = oval;
    }
  });
  return returnOption;
}

// ### ### ### ### END OF SCRIPT ### ### ### ###
</script>

<script lang="ts" setup>
// ### ### ### ### START OF SETUP SCRIPT ### ### ### ###
// const theGridRef = ref();
const theGrid = ref(); // pqgrid로 생성한 객체
const vueformRef = ref(); // vueform 객체
const parentRow = ref<any>({}); // 멀티그리드 화면에서 더블클릭한 headgrid의 row
const searchParameters = ref<any>({});
// const subData = ref();
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
// "search-parameters", // TODO: 검색조건 관련 이벤트는 vueform-event로 통합, 필요시 다시 확인

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

  // 조회했을 시점, 검색조건 emit (2025.08.11 김진우 추가, bulk-close에서 사용)
  // emit("search-parameters", searchParameters.value);
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

  // emit("sub-data", subData); 의미를 몰라 주석처리

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
  vueformRef.value.validate(); // reset 후, validation이 안 먹히는 이슈가 발생하여 뒤에 validate를 추가하였습니다. (2025.08.05 김진우)

  // getdataFetching.refresh(); //초기화 시 데이터 검색 x
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
  // 차일드의 save Start 까지 합해서 전부 치는 것으로
  // (둘 중 하나 이상이 없는 곳이 있을 수 있음)

  // if (typeof props.onBeforeSave === "function") {
  //   const result = await props.onBeforeSave(); // 💡 Promise로 처리
  //   if (result === false) return;
  // }
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
/*
* 만약 <PqGrid id="headGrid">
        <PqGrid id="itemGrid"/>
      </PqGrid> 이렇게 되어있는경우 itemGrid의 iAmSubGridOf에 headGrid의 정보가 들어감
*
*
*/
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
    // if (!c.format) c.format = "#,###.##";
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
    // c.originType = "time";
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
    // c.originType = "date";
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
  // 컬럼 validations에 api로 조회한 데이터에 대한 validation 추가
  props.extraUtil?.checkUniquenessOfParams
    .filter((p) => p.targetCols.includes(c.dataIndx + ""))
    .forEach((p) => {
      if (!c?.validations?.length) c.validations = [];
      // 별도의 apiUrl을 지정하지 않았다면 props의 url을 가져옴
      p.apiUrl = p.apiUrl || props.urlGet || props.url;
      const targetColLabels = p.targetCols
        .map(
          (cc) =>
            (props.colModel.find((ccc) => ccc.dataIndx == cc) || {}).title,
        )
        .join("+");
      if (iAmSubGridOf) {
        // 아이템그리드가 있는경우 더블클릭한 row의 값을 apiParemeters에 설정함
        watch(
          () => searchParameters.value,
          (newV) => {
            p.apiParameters = newV;
            // apiParameter를 searchParameters로 설정한 경우 checkUniquenessOf에서 첫 편집시에 theRefData가 빈 배열로 나와 따로 설정
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
                // 길이가 value보다 적으면 false
                return false;
              }
            };
            break;
          case "maxLen":
            v.type = function (ui: any) {
              if (ui.value && ui.value.toString().length > v?.value) {
                // 길이가 value보다 길면 false
                return false;
              }
            };
            break;
          case "lt":
            v.type = function (ui: any) {
              if ((ui.value || ui.value === 0) && ui.value >= v?.value) {
                // 값이 value보다 크거나 같으면 false
                return false;
              }
            };
            break;
          case "gt":
            v.type = function (ui: any) {
              if ((ui.value || ui.value === 0) && ui.value <= v?.value) {
                // 값이 value보다 작거나 같으면
                return false;
              }
            };
            break;
          case "lte":
            v.type = function (ui: any) {
              if ((ui.value || ui.value === 0) && ui.value > v?.value) {
                // 값이 value보다 크면
                return false;
              }
            };
            break;
          case "gte":
            v.type = function (ui: any) {
              if (ui.value && ui.value < v?.value) {
                // 값이 value보다 작으면
                return false;
              }
            };
            break;
          case "regexp":
            v.type = function (ui: any) {
              if (ui.value) {
                // 값이 value에서 설정한 정규식에 맞지않으면 false
                // 정규식을 검증하기 위해 RegExp 객체 생성
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
    // parentkey가 존재하고 init이 없는경우 init 강제설정
    if (!c.init) c.init = ({ parentRow }) => parentRow?.[c.dataIndx] || "";
  }
  // 확인필요 : parent에서 key에 해당하는 애들을 (중간에) 바꾸는 일이 일어날까?
  // grid multi select
  const columEditor = c.editor;
  if (typeof columEditor === "object") {
    if (columEditor?.type === "select" && columEditor?.multiSelect) {
      columEditor.init = customSelector; // 셀렉트 박스에는 util.ts에 customSelector적용
      columEditor.getData = function (ui: any) {
        const gridObject = unref(theGrid);
        const rowData = ui.rowData;
        // 멀티셀렉트의 경우에는 선택한 값 하나당 로우 하나를 추가
        if (ui.cellData && Array.isArray(ui.cellData[ui.column.dataIndx])) {
          for (
            let idx = 1;
            idx < ui.cellData[ui.column.dataIndx].length;
            idx++
          ) {
            // 새로운 행 데이터를 생성할 때 기존 rowData를 기반으로 생성
            if (columEditor.abreasetValue) {
              // abreasetValue 옵션이 있을경우에는 로우 하나에 모든 값을 세팅
              return ui.cellData[ui.column.dataIndx].join(",");
            } else {
              const newRow = { ...rowData };
              if (newRow["rowkey"]) {
                newRow["rowkey"] = null; // rowkey를 null처리
              }
              newRow[ui.column.dataIndx] = ui.cellData[ui.column.dataIndx][idx];
              gridObject.addRow({
                newRow: newRow,
                checkEditable: false,
              });
            }
          }
          return ui.cellData[ui.column.dataIndx][0]; // updateRow로 하면 해당 컬럼에만 값이 들어가지 않아 add먼저하고 첫번째 값 반환
        }
      };
    } else if (columEditor.type === "select") {
      columEditor.init = customSelector;
      columEditor.getData = function (ui: any) {
        return ui.cellData;
      };
    }
    // 셀렉트에서
    if (columEditor?.type != "select") return;
    // 이하 부분 변경됩니다.
    columEditor.labelIndx = columEditor?.labelIndx || "label";
    columEditor.valueIndx = columEditor?.valueIndx || "value";

    columEditor._labelIndex = columEditor.labelIndx + "";
    columEditor._valueIndex = columEditor.valueIndx + ""; // number 버림
  }

  // if (!c.render) c.render = SelectRenderer;
  if (c.optionListRef && !c.render) c.render = SelectRenderer;
  if (!c.sortType && c.optionListRef) {
    // 컬럼 헤드를 클릭했을때 정렬을 코드값이 아닌 라벨값으로 정렬
    c.sortType = (rowData1: any, rowData2: any, dataIndx: any) => {
      // rowData1: 첫번째 row, rowData2: 두번째 row, dataIndx: dataIndx

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
      // edtitor에서 설정한 labelIndx의 값을 가져옴
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

// ==================================== 월 선택 관련 (2026.02.04 김진우 추가) ====================================

// 선택된 월 및 연도
const selectedMonth = ref<MonthDate>(
  // default value가 있을 때
  (props.searchConditions?.find((c) => c.elementType === "monthDate")
    ?.defaultvalue as MonthDate) || null,
);

/**
 * 월 선택 시 이벤트
 * vueDatePicker 포맷을 변경해서 sarchParameter에 세팅합니다.
 */
function handleMonthDate(value: MonthDate) {
  // debugger;
  if (!value) return;

  // 월에 1 더해주기
  const month =
    (typeof value.month === "string" ? parseInt(value.month) : value.month) + 1;
  const year = value.year;
  // console.log("year : ", year, ", month : ", month);

  const monthDateCol = props.searchConditions?.find(
    (c) => c.elementType === "monthDate",
  );

  if (!monthDateCol) return;

  // 배열로 ["2026-08-01", "2026-08-30"] 으로 만들기
  const start = dayjs(`${year}${String(month).padStart(2, "0")}01`).format(
    "YYYYMMDD",
  );
  const end = dayjs(`${year}${String(month).padStart(2, "0")}01`)
    .endOf("month")
    .format("YYYYMMDD");

  // searchParameters에 세팅
  searchParameters.value[monthDateCol.key] = [start, end];
}
// ==============================================================

const _dataIndxList = props.colModel.map((c) => c.dataIndx);

/**
 * CheckUniquenessOf 오타 등 Devwarn
 * Colmodel의 컬럼과 checkUniquenessOfParams에서 지정한 컬럼이 맞지 않는경우
 */
props.extraUtil?.checkUniquenessOfParams
  .map((p) => p.targetCols)
  .forEach((targetCols) => {
    const notFoundCols = targetCols.filter((c) => !_dataIndxList.includes(c));
    if (!notFoundCols?.length) return;
    // useDevWarn({
    //   title: "checkUniquenessOf 오류",
    //   description:
    //     "해당하는 column 들을 찾을 수 없습니다 : " + notFoundCols?.join(", "),
    // });
  });

/**
 * 그리드의 옵션리스트에 담을 Dynamic Options 처리
 */
const watchesDynamicOptions = ref<any[]>([]);

/**
 * watchesDynamicOptions에 담을 컬럼들 정리
 */
props.colModel
  ?.filter((c) => isRef(c?.optionListRef) || c?.optionFilter)
  .forEach((c) => watchesDynamicOptions.value.push(c.optionListRef));

/**
 * select option 이 다이나믹하게 바뀌므로 watch함. 이걸 select option에 넣어줌
 */
watchDebounced(
  () => watchesDynamicOptions.value,
  (newV) => {
    theGrid?.value?.showLoading();
    setSelctionOptionsAgain();
    theGrid?.value?.hideLoading();
  },
  { debounce: 500, deep: true }, // 0.5초동안 watchesDynamicOptions의 값의 변경이 없으면 optionlist 적용
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
  }, // 아이템 그리드에서 행 추가할때 parentRow확인을 위해
  ...props.options,
};

// eslint-disable-next-line no-self-assign
optionsIN.toolbar = optionsIN.toolbar;
optionsIN.dataModel = optionsIN.dataModel || {};
optionsIN.dataModel.recIndx = optionsIN?.dataModel?.recIndx || "rowkey";
optionsIN.colModel = props.colModel; // as Array<pq.gridT.column & ColModel>;
optionsIN.columnTemplate =
  props.toolbarItems?.find !== false ? { render: findRender } : undefined;
optionsIN.beforeValidate = function (event: any, ui: any) {
  whenChange(event, ui, this, unref(parentRow));
};

// option에 없는 것을 붙여넣으려고 하면 해당 부분만 원데이터로 바꿈
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

/**
 * ColModel 맨 처음에 체크박스 추가
 */
if (
  optionsIN.colModel?.[0]?.type !== "checkbox" &&
  (buttons?.save || props.needState)
) {
  optionsIN.colModel?.unshift({
    title: "-",
    type: "checkbox",
    dataType: "bool",
    dataIndx: "state",
    // editable: true,
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

/**
 * skipcre... 가 없으면 해당 컬럼들 추가
 * 마지막 creuser 등 추가
 */
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

/**
 * skiplmo...가 없으면 해당 컬럼들 추가
 */
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

/**
 * ColModel Header Style, Grid Border Style, font Style add
 */
optionsIN.colModel.forEach((object) => {
  object.styleHead = {
    // "backgroud-color": "#ECF1F9",
    // "font-family": "Apple SD Gothic Neo",
    "font-size": "0.9rem",
    "font-weight": "bold",
    "border-bottom": "1px solid #DBE0E5", // 컬럼해도 bottom 선 강제 추가
    // "border-color": "#DBE0E5",
  };
  object.halign = "center";
  object.hvalign = "center";
  object.valign = "center";
  object.style = { "font-size": "0.85rem" };
});

/**
 * esc키를 누를경우 validation메시지 제거 및 편집 종료
 */
function deleteValidationFocus(event: KeyboardEvent) {
  const pqToolTip = document.querySelector(".ui-tooltip") as HTMLElement;
  if (pqToolTip && event.key === "Escape") {
    pqToolTip.remove(); // 툴팁을 제거
    unref(theGrid).quitEditMode(); // 편집종료
  }
}

/**
 * optionList가 있는 컬럼의 렌더
 */
function SelectRenderer(ui: pq.gridT.renderObj) {
  const cellData = ui?.cellData;
  const editor = ui?.column?.editor as Editor2;
  let options = editor?.options || [];
  const title = ui?.column?.title || "";
  if (typeof options == "function") {
    // @ts-expect-error
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
      // if (targetC) makeEditorInColM(targetC);
      options =
        targetC?.editor?.options || targetOriginCol?.editor?.options || [];
    }
  }
  const column = ui.column as ColModel;

  const label = options?.find?.((o) => o[cellData])?.[cellData];
  if (!label) {
    if (!cellData) return cellData;
    // useDevWarn({
    //   title: `GRID : ${title}(${ui?.column?.dataIndx || ""})`,
    //   description: `column 값의 labelIndx(${editor?._labelIndex}) 혹은 valueIndx(${editor?._valueIndex})를 잘못 쓰셨거나 데이터가 없는 것 같습니다. : (${cellData}) 찾을 수 없음.`,
    // });
    // editor의 option에 입력한 값이 없을경우 해당셀 빈값처리
    // ui.rowData[ui?.dataIndx] = "";
  }
  // 툴바의 find버튼에서 render를 위해 추가
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

/**
 * TODO 어떤 함수인지 설명 필요. 필요 없는 함수라면 과감하게 정리할 것.
 */
const layoutSettDone = ref(false);

/**
 * optionListRef의 셀렉트박스를 컬럼 셀렉트 박스로 넣는 함수
 */
async function setSelctionOptionsAgain() {
  // if (!layoutSettDone?.value) {
  //   setTimeout(() => {
  //     setSelctionOptionsAgain();
  //   }, 500);
  //   return;
  // }

  // optionListRef나 optionFilter가 설정된 컬럼
  const dynamicSelects = theGrid?.value?.colModel?.filter(
    (c: any) => c.optionListRef || c.optionFilter,
  );

  if (!dynamicSelects?.length) return;
  theGrid.value.colModel.forEach((c: pq.gridT.column & ColModel) => {
    makeEditorInColM(c);
  });

  await theGrid?.value?.refresh?.(); // 초기에 데이터가 다 들어오지 않은상태에서 addRow된 데이터를 저장하려 할떄 반영 안됨
}

/**
 * 각 컬럼 별 optionListRef을 editor의 셀렉트박스 option으로 설정
 */
function makeEditorInColM(c: pq.gridT.column & ColModel) {
  // if (!c.optionListRef || !c.optionFilter) return;
  if (!c.optionListRef) return;
  const colsOrigin = optionsIN.colModel?.find(
    (cc) => cc.dataIndx == c.dataIndx,
  ) as ColModel;
  // select Ref 의 options 변경
  if (!c.editor || typeof c.editor === "boolean") c.editor = {};

  const columnEditor = c.editor as Editor2;
  // optionListRef c.editor.option 에 넣기
  if (c.optionListRef) {
    if (
      // @ts-expect-error
      unref(c.optionListRef)?.length !=
      (unref(colsOrigin?.optionListRef || []) as any).length
    ) {
      // 원본ColModel과 optionsIN ColModel의 optionListRef의 길이가 다르다면 원본 optionListRef 선택
      c.optionListRef = colsOrigin?.optionListRef;
    }
    // @ts-expect-error
    if (c.optionListRef?.provide) columnEditor.options = [];
    else columnEditor.options = unref(c.optionListRef) as any[];
  }
  if (typeof c.editor.labelMapFunction == "function") {
    // labeling 이 펑션이라면 셀렉트박스의 라벨을 해당하는 function으로 설정
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
        // WARN: parentRowRef -> parentRow로 변경
        [e?.[columnEditor?._valueIndex || ""]]:
          e?.[columnEditor?._labelIndex || ""],
      })); // valueIndx와 labelIndex가 풀리기 때문에 다시 value와 lavbel 지정
  }

  const originTarget = optionsIN.colModel?.find(
    (cc) => cc.dataIndx == c.dataIndx,
  );
  if (originTarget) originTarget.editor = columnEditor;
}

/**
 * 검색영역 초기값 세팅
 */
const setDefault = () => {
  // 아직 데이터가 안 와서 대기 중인 이전 watch들을 모두 중단

  // 각 컬럼의 dataIndx로 지정된 값을 가진 뷰폼에 기본값 설정
  props.searchConditions?.forEach((c) => {
    if (typeof c.defaultvalue === "boolean" && c.defaultvalue === true) {
      // 옵션이 존재하는 경우
      if (c.elementType === "select" || c.elementType === "multiselect") {
        let stop: any;
        // watch를 통해 api로 받아온 옵션이 searchElementItem에 세팅되면 searchParameters에 세팅
        // eslint-disable-next-line prefer-const
        stop = watch(
          () => unref(c.searchElementItem),
          (newItems) => {
            if (newItems.length > 0) {
              const firstVal = newItems[0][c.searchProp.valueProp]; // list의 첫번째 값을 검색조건으로 설정
              if (c.elementType === "select") {
                searchParameters.value[c.key] = firstVal;
              } else if (c.elementType === "multiselect") {
                searchParameters.value[c.key].push(firstVal);
              }

              if (vueformRef.value) {
                // 개별 엘리먼트를 찾아 직접 값을 설정
                vueformRef.value
                  .el$(c.key)
                  ?.update(searchParameters.value[c.key]);
              }
            }
            if (stop) {
              // watch 중단
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

/**
 * 컴포넌트 mount됐을때 이벤트
 */
onMounted(async () => {
  // DB에서 설정된 option을 가져옴
  // const gridOption = await loadLayoutSetting(
  //   props.gridId,
  //   props.colModel,
  //   optionsIN,
  // );
  // await nextTick();
  if (theGrid.value) return;
  // 그리드 생성
  theGrid.value = pq.grid(`#${props.gridId}`, optionsIN);
  // change 및 원본 데이터와 다를 때마다 value 변경
  // theGrid.value.on("beforeValidate", function (event: any, ui: any) {
  //   // @ts-expect-error
  //   whenChange(event, ui, this, unref(parentRow));
  // });

  (async () => {
    theGrid.value?.showLoading?.();
    // 저장한 그리드세팅 불러오기
    layoutSettDone.value = true;

    theGrid.value?.hideLoading?.();
  })();

  // option에 없는 것을 붙여넣으려고 하면 해당 부분만 원데이터로 바꿈
  // WARN: 임시 주석처리, 신규beforepaste 확인 후 제거요망
  // theGrid.value.on("beforePaste", function (evt: any, ui: any) {
  //   const firstCol = ui?.areas?.[0]?.firstC || ui?.areas?.[0]?.c1 || 0;
  //   const firstRow = ui?.areas?.[0]?.firstR || ui?.areas?.[0]?.r1 || 0;
  //   const originPdata = theGrid.value?.pdata || [];
  //   const targetColumns =
  //     theGrid.value?.colModel?.filter?.(
  //       (c: any, cidx: number) =>
  //         cidx >= firstCol && cidx < firstCol + ui.rows?.[0]?.length,
  //     ) || [];
  //   ui.rows.forEach((pastedRow: any, ridx: number) => {
  //     pastedRow.forEach((pastedDatum: any, cidx: number) => {
  //       const targetCol = targetColumns[cidx];
  //       if (
  //         targetCol?.optionListRef?.value?.length ||
  //         (targetCol?.editor?._options?.length &&
  //           !targetCol?.editor?.abreasetValue)
  //       ) {
  //         const valueList = (targetCol?.editor?._options || []).map(
  //           (opt: any) => Object.keys(opt)?.[0],
  //         );

  //         if (valueList.includes(pastedDatum)) return;

  //         const myRow = firstRow + ridx;
  //         const originDatum = originPdata[myRow]?.[targetCol?.dataIndx || ""];

  //         ui.rows[ridx][cidx] = originDatum;
  //       }
  //     });
  //   });
  // });

  // 마음에 안드는 기본 문구 수정
  changeGridMessageOfnoRow(theGrid, t("noRows"));

  // 기본검색값 설정
  setDefault();

  if (iAmSubGridOf) {
    // 아이템 그리드는 행을 더블클릭하지 않으면 잠금상태
    // lockChildGrid(true);

    // 헤더를 초기화 할 경우 아이템그리드도 초기화
    if (iAmSubGridOf) {
      // @ts-expect-error
      iAmSubGridOf.value.on("beforeValidate", function (event: any, ui: any) {
        if (ui.source === "rollback") {
          // 아이템 완전히 비우고 락걸고
          // theGrid.value.rollback();
          // theGrid.value.history({ method: "reset" });
          resetGridOf(theGrid, []);
          // lockChildGrid(true);
          parentRow.value = {};
          searchParameters.value = {};
          return;
        }
      });
    }

    // parent 에서 더블클릭 할 때마다...
    // @ts-expect-error
    iAmSubGridOf.value.on("rowDblClick", function (event: any, ui: any) {
      // lockChildGrid(false); // 더블클릭만 해도 편집가능하도록 위치변경
      const newParentRow = ui.rowData || {};
      // 내/다른 children이 editing 이라면 날라갈테니 confirm
      if (getIsEditing(theGrid)) {
        if (!confirm(t("confirm.resetChildrenGrid"))) return;
        resetGridOf(theGrid, []);
      }

      // changeHeaderRowCls(iAmSubGridOf, ui.$tr);
      changeHeaderRowCls(iAmSubGridOf, ui.rowIndx);

      // TODO : parameter를 변경하고 싶은 경우가 있을까?
      parentRow.value = newParentRow;
      searchParameters.value = newParentRow;
      // 더블클릭한 행의 데이터를 param으로 해서 조회 api호출
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
        // 추가적으로 호출할 함수가 있을경우 호출해줌
        props.searchAddEvent(searchParameters);
      }
    });

    //  gridBox에 나 자신 추가
    if (props.sendItemType) {
      if (!givenGridBoxSet) return;
      if (givenGridBoxSet.value[props.sendItemType]) {
        useDevWarn({
          title: "sendItemType 겹침 : " + props.sendItemType,
        });
      }
      givenGridBoxSet.value[props.sendItemType] = theGrid;
    }
  }
  // theGrid.value.$count?.find?.(".pq-grid-norows")?.text?.(t("noRows"));
  document.addEventListener("keydown", deleteValidationFocus);
});

/**
 * TODO 어떤 함수인지 설명 필요. 필요 없는 함수라면 과감하게 정리할 것.
 * parent resize 처리
 */
// const parentDivOfGrid = useTemplateRef("parentDivOfGrid");

/**
 * TODO 어떤 함수인지 설명 필요. 필요 없는 함수라면 과감하게 정리할 것.
 */
// const resizeObserver = new ResizeObserver(function (mutations) {
//   // // @ts-expect-error
//   // this.emit("resize", mutations);
//   gridParentResize();
// });

/**
 * TODO 어떤 함수인지 설명 필요. 필요 없는 함수라면 과감하게 정리할 것.
 */
// onMounted(() => {
//   // @ts-expect-error
//   resizeObserver.observe(parentDivOfGrid.value);
// });

/**
 * TODO 어떤 함수인지 설명 필요. 필요 없는 함수라면 과감하게 정리할 것.
 */
// function gridParentResize() {
//   // theGrid.value.option("height", "100%-30");
//   theGrid.value?.option?.("height", "100%");
// }

/**
 * 중복확인할 값에 대한 list를  호출
 *  */
function setWatchUniqunessAll() {
  (props.extraUtil?.checkUniquenessOfParams || [])?.filter(
    (u) =>
      // watchesUniquenessAll.value.push(
      useApiData(u.apiUrl || props.urlGet || props.url, u.apiParameters || {}),
    // ),
  );
}

/**
 * 각 페이지에서 사용 가능한 컴포넌트 함수
 */
defineExpose({
  theGrid,
  searchStart,
  saveStart,
  searchReset,
  checkValidBeforeSave,
});

/**
 * 그리드 조회 api
 */
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

/**
 * 그리드 저장 api
 */
// const postdataFetching = await useAPIFetch(
//   props.urlPost ?? props.url + "/process",
//   {
//     method: "post",
//     async onRequest({ request, options }) {
//       // changes를 모두 불러와서 각 head item sub에 담아 보내기.
//       options.body = convertTheChangesToBodyParams(theGrid, gridBoxSet);
//     },
//     onResponse({ request, options, response }) {
//       if (!response.ok) {
//         // 저장 실패 : 메세지 있을경우, 없을경우 처리 분기함
//         if (response._data?.message != "") {
//           alert(t(response._data?.message));
//         } else {
//           alert(t("fail.save"));
//         }
//         return;
//       }
//       if ((response?._data as number) > -1) {
//         // alert(t("success.save", { rownumb: response?._data }));
//       }
//       if (props.onlyInsertGrid) {
//         resetGridOf(theGrid, []);
//       } else {
//         getdataFetching.refresh();
//       }
//       setWatchUniqunessAll(); // 모든 uniqueness도 새로 불러오기
//     },
//     immediate: false, // 첫 실행 안함
//   },
// );

/**
 * 그리드 저장 api 변경
 */
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
          // alert(t("success.save", { rownumb: response?._data }));
          if (props.onlyInsertGrid) {
            resetGridOf(theGrid, []);
          } else {
            getdataFetching.refresh();
          }
          setWatchUniqunessAll(); // 모든 uniqueness도 새로 불러오기
        }
      },
    });
  } catch (error) {
    console.log(error);
  } finally {
    theGrid.value?.hideLoading?.();
  }
}

/**
 * 조회시 상태가 변경될때마다 showLoading, hideeLoading및 rowkey처리
 */
watch(getdataFetching.status, (newV) => {
  // debugger;

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

/**
 * POST시 상태가 변경될때 마다 showLoading 및 hideLoading 처리
 */
// watch(postdataFetching.status, (newV) => {
//   if (newV == "pending") theGrid.value?.showLoading?.();
//   else theGrid.value?.hideLoading?.();
// });

const givenGridBoxSet: Ref<GridBoxSet> | undefined = inject(
  "gridBoxSet",
  undefined,
);
</script>

<style>
/* 스크립트에서 로드하던 CSS를 스타일 블록으로 이동하거나
   번들러가 처리하도록 하여 초기 파싱 차단 해제 */
@import "jquery-ui-pack/jquery-ui.structure.css";
@import "jquery-ui-pack/jquery-ui.theme.css";
@import "pqgrid/pqgrid.min.css";
@import "pqgrid/pqgrid.ui.min.css";
@import "pqgrid/themes/bootstrap/pqgrid.css";
</style>
