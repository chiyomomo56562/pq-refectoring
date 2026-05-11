# i18n 설명서

https://i18n.nuxtjs.org/
https://vue-i18n.intlify.dev/

1. template 내에서 쓰는 법

```vue
<div> {{ $t('hello') }} </div>
```

- $t 로 쓰세요

2. script 내에서 쓰는 법

```ts
const { t } = useI18n();

console.log("translated : ", t("hello"));
```

- t를 불러서 쓰세요.

3. 메세지 넣는 방법 1 : 전역 json

- /lang/ko-KR-[자기 이름].json
- 해당 파일에 json 형식으로 넣으면 됩니다. (key : value) = (부르는 값 : 나타나는 라벨값)

4. 메세지 넣는 방법 2: 파일 내 SFC

```vue
<template>
  <div>{{ t("hello2") }}</div>
</template>
<i18n>
<!-- 여기에 넣으세요 -->
ko:
    hello: 안녕~
</i18n>
```

- i18n 블록을 만들어서 넣으시면 됩니다.
- yaml 파일 형식이니 해당 형식에 맞게 넣어주시면 됩니다.

5. 포매팅
   https://vue-i18n.intlify.dev/guide/essentials/syntax.html

```vue
<template>
  <div>{{ t("hello3", { myName: "내 이름" }) }}</div>
</template>
<i18n>
ko:
    hello3: 안녕하십니까, {myName} 님
</i18n>
```

6. js 파일 (util 등) 에서 i18n 부르는 방법

```js
import { useNuxtApp } from '#imports'
...

...
// inside the function
  const nuxtApp = useNuxtApp();
  const t = nuxtApp.$i18n.t;
  t('hello')
...

```

- useNuxtApp 을 js 파일의 전역에서 실행하지 마세요.

!!! 주의점 !!!

1. 한글(ko)과 영어(en)를 같이 만들어야 한다.
2. Event 메세지 중 Kakao 타입의 경우는 뿌리오 사이트에서 검수 받아야 사용할 수 있다. 즉, 함부로 수정하면 안됨.
