<template>
  <div class="blog-slider">
    <div class="blog-slider__wrp swiper-wrapper">
      <div
        class="blog-slider__item swiper-slide"
        v-for="(data, index) in dataJson"
        ::key="index"
      >
        <div class="blog-slider__img">
          <img :src="data?.image" alt="" />
        </div>
        <div class="blog-slider__content">
          <div class="blog-slider__title">
            <i :class="data?.icon"></i
            ><span class="text">{{ data?.title }}</span>
          </div>
          <div class="blog-slider__text">
            {{ data?.text }}
          </div>
          <a :href="data?.href" class="blog-slider__button">点击跳转</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import dataJson from "../public/data/data.json";
</script>
<style scoped>

</style>
