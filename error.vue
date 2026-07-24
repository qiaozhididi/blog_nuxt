<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

// 404 与其他错误差异化文案
const isNotFound = computed(() => props.error?.statusCode === 404)
const errorTitle = computed(() =>
  isNotFound.value ? '页面走丢了' : '服务器开小差了',
)
const errorMessage = computed(() =>
  isNotFound.value
    ? '你访问的页面不存在，可能已被移动或删除。'
    : props.error?.statusMessage || '请稍后再试，或返回首页继续浏览。',
)

function handleError() {
  clearError({ redirect: '/' })
}

useHead({
  title: isNotFound.value ? '页面不存在' : '出错了',
})
</script>

<template>
  <div class="h-screen flex items-center justify-center bg-gray-900 text-white p-8">
    <div class="text-center max-w-md">
      <div class="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
        {{ error?.statusCode || '错误' }}
      </div>
      <h1 class="text-2xl md:text-3xl font-bold mb-4">{{ errorTitle }}</h1>
      <p class="text-gray-400 mb-8">{{ errorMessage }}</p>
      <button @click="handleError" class="btn-primary">
        <i class="fa fa-home mr-2" aria-hidden="true"></i>返回首页
      </button>
    </div>
  </div>
</template>
