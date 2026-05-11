<template>
  <Vueform ref="vueform" v-model="localModelValue" class="grid-form">
    <SelectElement
      v-if="!options.editor.multiSelect"
      ref="selectElement"
      :name="options.dataIndx"
      :items="optionList"
      :default="localModelValue[options.dataIndx]"
      :placeholder="
        localModelValue[options.dataIndx] !== null &&
        localModelValue[options.dataIndx] !== undefined
          ? ''
          : options.column.title
      "
      :append-to-body="true"
      :search="true"
      autocomplete="off"
      @open="selectorOpen"
    />
    <MultiselectElement
      v-else-if="options.editor.multiSelect"
      ref="selectElement"
      :name="options.dataIndx"
      :groups="true"
      :items="groupList"
      :placeholder="
        Array.isArray(localModelValue[options.dataIndx]) &&
        localModelValue[options.dataIndx].length > 0
          ? ''
          : options.column.title
      "
      :default="valueArray"
      :hide-selected="false"
      :append-to-body="true"
      :search="true"
      :close-on-select="false"
      autocomplete="off"
    >
      <template #group-label="{ group }">
        <div
          class="flex items-center w-full px-3 py-1 text-sm font-bold cursor-pointer"
        >
          {{ group.label }}
        </div>
      </template>
    </MultiselectElement>
    <!-- :native="false" -->
    <!--  :default="[localModelValue[options.dataIndx]]" -->
    <!-- :attrs="{ autofocus: true }" -->
    <!-- @open -->
  </Vueform>
</template>

<script lang="ts" setup>
const props = defineProps<{
  // modelValue?: any; //ui.cellData
  initValue?: any; // ui.cellData
  options: {
    // ui
    dataIndx: string;
    editor: {
      search?: boolean;
      multiSelect?: boolean;
    };
    column: {
      title: string;
    };
  };
  optionList?: any;
}>();

const groupList = { label: "All select", items: props.optionList || [] };

const vueform = ref();
const selectElement = ref();
const emit = defineEmits<{
  (event: "update:value", newValue: string | number | undefined): void;
  (event: "save-editor", evt: KeyboardEvent): void;
}>();
const localModelValue = ref(unref(props.initValue));
const value = unref(localModelValue)[props.options.dataIndx];

// 쉼표로 분리하여 배열로 변환
const valueArray = value ? String(value).split(",") : [];
// ui.cellData
watch(localModelValue, (newValue) => {
  emit("update:value", newValue);
});

let inputElement: HTMLInputElement | null = null;

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" || event.key === "Tab") {
    emit("save-editor", event);
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    setTimeout(() => {
      const pointedOption = document.querySelector(
        ".vf-multiselect-option-pointed",
      );
      if (pointedOption) {
        pointedOption.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    }, 0);
  }
}

// 셀렉트박스 오픈시 강제로 스크롤
function selectorOpen(el: any) {
  const pointedOption = document.querySelector(
    `#${props.options.dataIndx}-multiselect-option-${value}`,
  );
  // const elOption = el.$el.querySelector(".vf-select-option-selected");
  if (pointedOption) {
    setTimeout(() => {
      pointedOption.scrollIntoView({ block: "nearest" });
    }, 0);
  }
}

onMounted(() => {
  inputElement = selectElement.value.$el.querySelector("input");
  inputElement?.focus();
  inputElement?.addEventListener("keydown", handleKeydown);
  const unwatch = watch(
    () => selectElement.value.value,
    (newV) => {
      if (newV) inputElement?.focus();
    },
  );
});

onBeforeUnmount(() => {
  inputElement?.removeEventListener("keydown", handleKeydown);
});
</script>
