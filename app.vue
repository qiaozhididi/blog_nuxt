<script setup lang="ts">
// 标题模板需为函数形式（条件格式化），而 nuxt.config 的 app.head 类型为
// 可序列化形式（titleTemplate 仅支持 string），故在运行时 useHead 中设置。
// 仅设 titleTemplate：有子页面标题则加后缀，无标题（首页）时由 else 分支返回默认标题
useHead({
  titleTemplate: (title?: string) => title ? `${title} - 乔治弟弟_Blog` : '乔治弟弟_Blog',
});
</script>

<template>
  <NuxtPage />
</template>

<style>
/* Reset some basics */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #__nuxt {
  height: 100%;
  width: 100%;
}

/* 全局滚动条样式优化 (仅用于Reveal内部滚动内容) */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
