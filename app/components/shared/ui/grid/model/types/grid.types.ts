import type { Ref } from "vue";
import type pq from "pqgrid";

/**
 * TODO 어떤 함수인지 설명 필요. 필요 없는 함수라면 과감하게 정리할 것.
 */
export interface MonthDate {
  month: string | number;
  year: string | number;
}

/**
 * 검색영역 설정을 위한 props
 * DTO를 그대로 가져와서 import도 가능하니깐 그걸 바로 가져와서 연동도 가능하다
 * 검색영역 기반
 */
export interface SearchListBase {
  key: string;
  label: string;
  required?: boolean;
  defaultvalue?: string | boolean | string[] | MonthDate;
}

/**
 * 검색영역 타입이 셀렉트박스나 멀티셀렉트인 경우
 */
export interface SearchListSelect extends SearchListBase {
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
export interface SearchListDate extends SearchListBase {
  elementType: "date" | "singleDate" | "monthDate";
  dateOption?: { maxDate?: Date; minDate?: Date };
}

/**
 * 그 외 검색영역
 */
export interface SearchListNonSelect extends SearchListBase {
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
 * 그리드 셀렉트박스에서 보여줄 label을 직접 설정
 */
export type LabelMapFunction = (oneOptionObject: any) => any;

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
export type DateEditorOptionOrFactory =
  | DateEditorOption
  | ((ui: any) => DateEditorOption);

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
 * 특정 조건에 따라 변경되는 컬럼의 optionList
 */
export type OptionFilter = (
  ui: pq.gridT.renderObj,
  theGrid: any,
  parentRowRef?: Ref<any>,
) => any[];

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

// 그리드의 변경목록
export type GridChanges = {
  addList: any[];
  updateList: any[];
  oldList: any[];
  deleteList: any[];
};
