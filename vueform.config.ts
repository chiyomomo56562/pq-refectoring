import en from "@vueform/vueform/locales/en";
import ko from "@vueform/vueform/locales/ko";
import vueform from "@vueform/vueform/dist/vueform";
import { defineConfig } from "@vueform/vueform";
import MaskPlugin from "@vueform/plugin-mask";

// nuxt-vueform은 vueform.config를 찾기때문에 항상 세팅해야함
export default defineConfig({
  theme: vueform,
  locales: { ko, en },
  locale: "ko",
  plugins: [MaskPlugin],
  showRequired: ["label"],
});
