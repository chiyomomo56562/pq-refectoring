import type pq from "pqgrid";
import type { ColModel } from "../model/types/grid.types";

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
