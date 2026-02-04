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
  overflow: hidden;
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
