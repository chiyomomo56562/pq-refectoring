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
import { ref, provide, inject, type Ref } from "vue";
import type pq from "pqgrid";
import { useGridOperations } from "../composables/useGridOperations";
import { useGridSetup } from "../composables/useGridSetup";

import type {
  SearchList,
  ColModel,
  MonthDate,
  ExtraUtil,
  GridBoxSet,
  ToolbarItems,
} from "../model/types/grid.types";

// -----------------------------------------------------------
// [1] State & Variable Declarations
// -----------------------------------------------------------
const theGrid = ref(); // pqgrid로 생성한 객체
const vueformRef = ref(); // vueform 객체
const parentRow = ref<any>({}); // 멀티그리드 화면에서 더블클릭한 headgrid의 row
const searchParameters = ref<any>({});
const { t } = useI18n();

const radioElement = { "": t("useyn.all"), Y: t("useyn.y"), N: t("useyn.n") };

const props = defineProps<{
  gridTitle?: string;
  gridId: string;
  buttonsShow?: { search?: boolean; reset?: boolean; save?: boolean };
  options?: pq.gridT.options;
  colModel: Array<pq.gridT.column & ColModel>;
  url: string;
  urlGet?: string;
  urlPost?: string;
  sendItemType?: "" | "head" | "item" | "sub";
  getInit?: object;
  toolbarItems?: ToolbarItems;
  skipCreDateUser?: boolean;
  skipLmoDateUser?: boolean;
  extraUtil?: ExtraUtil;
  onlyInsertGrid?: boolean;
  onBeforeSave?: () => boolean | Promise<boolean>;
  needState?: boolean;
  toolbarRemove?: boolean;
  onSearchStart?: () => void;
  searchAddEvent?: Function;
  searchConditions?: Array<SearchList>;
}>();

const emit = defineEmits(["send-data", "before-save", "vueform-event"]);

function vueformMounted(el: any) {
  emit("vueform-event", el);
}

// -----------------------------------------------------------
// [2] Injection & Provision for Parent-Child Logic
// -----------------------------------------------------------
provide("iAmSubGridOf", theGrid); 
const iAmSubGridOf: Ref<any> | undefined = inject("iAmSubGridOf", undefined);

const gridBoxSet = ref<GridBoxSet>({});
provide("gridBoxSet", gridBoxSet); 
if (props.sendItemType) {
  gridBoxSet.value[props.sendItemType] = theGrid;
}

const givenGridBoxSet: Ref<GridBoxSet> | undefined = inject("gridBoxSet", undefined);

const selectedMonth = ref<MonthDate>(
  (props.searchConditions?.find((c) => c.elementType === "monthDate")
    ?.defaultvalue as MonthDate) || null
);

const buttons = { search: true, reset: true, save: true, ...props.buttonsShow };

// -----------------------------------------------------------
// [B] Runtime Interaction Operations
// -----------------------------------------------------------
const operations = useGridOperations({
  theGrid,
  vueformRef,
  parentRow,
  searchParameters,
  selectedMonth,
  gridBoxSet,
  props,
  emit,
  t,
});

const {
  getdataFetching,
  handleSearchClick,
  searchStart,
  searchReset,
  saveStart,
  checkValidBeforeSave,
} = operations;

// -----------------------------------------------------------
// [A] Initial Rendering & Configuration Setup
// -----------------------------------------------------------
const setup = useGridSetup({
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
});

const { optionsIN, setDefault, layoutSettDone } = setup;

// -----------------------------------------------------------
// [Expose]
// -----------------------------------------------------------
defineExpose({
  theGrid,
  searchStart,
  saveStart,
  searchReset,
  checkValidBeforeSave,
});
</script>

<style>
@import "jquery-ui-pack/jquery-ui.structure.css";
@import "jquery-ui-pack/jquery-ui.theme.css";
@import "pqgrid/pqgrid.min.css";
@import "pqgrid/pqgrid.ui.min.css";
@import "pqgrid/themes/bootstrap/pqgrid.css";
</style>
