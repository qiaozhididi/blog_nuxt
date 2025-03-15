<template>
  <div class="blog-slider swiper-container">
    <div class="blog-slider__wrap swiper-wrapper">
      <div
        class="blog-slider__item swiper-slide"
        v-for="(data, index) in details"
        :key="index"
      >
        <div class="blog-slider__img">
          <img :src="data?.image" alt="" />
        </div>
        <div class="blog-slider__content">
          <div class="blog-slider__title">
            <i :class="data?.icon"></i>
            <span class="text">{{ data?.title }}</span>
          </div>
          <div class="blog-slider__text">
            {{ data?.text }}
          </div>
          <a :href="data?.href" class="blog-slider__button">点击跳转</a>
        </div>
      </div>
    </div>
    <!-- 分页器 -->
    <div class="blog-slider__pagination swiper-pagination"></div>
  </div>
  <!-- 底部版权 -->
  <div class="footer">Copyright &reg; 2024 All Rights 乔治弟弟.</div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick } from "vue";
import Swiper from "swiper";
import "swiper/css";
import "swiper/css/pagination";
// 导入Mousewheel模块
import { Pagination, Mousewheel } from "swiper/modules";
import dataJson from "../public/data/data.json";

interface DataItem {
  image: string;
  title: string;
  text: string;
  href: string;
  icon: string;
}

const details = ref<DataItem[]>(dataJson);

onMounted(() => {
  nextTick(() => {
    new Swiper(".blog-slider", {
      modules: [Pagination, Mousewheel], // 添加Mousewheel模块
      loop: true,
      pagination: {
        el: ".blog-slider__pagination",
        clickable: true,
      },
      spaceBetween: 30,
      effect: "coverflow",
      coverflowEffect: {
        rotate: 0,
        stretch: 0,
        depth: 100,
        modifier: 1,
        slideShadows: false,
      },
      mousewheel: {
        sensitivity: 1, // 调整滚轮灵敏度
        releaseOnEdges: true, // 在边缘释放滚动
      },
      slidesPerView: 1,
    });
  });
});
</script>

<style scoped lang="scss">
@import url("https://fonts.googleapis.com/css?family=Fira+Sans:400,500,600,700,800");

* {
  box-sizing: border-box;
}

html,
body {
  overflow: hidden; // 添加这一行来隐藏滚动条
  margin: 0;
  padding: 0;
}

body {
  background-image: linear-gradient(147deg, #bc59c6 0%, #7dc4cc 74%);
  min-height: 100vh;
  font-family: "Fira Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.blog-slider {
  width: 95%;
  max-width: 800px;
  background: #fff;
  box-shadow: 0px 14px 80px rgba(34, 35, 58, 0.2);
  padding: 25px;
  border-radius: 25px;
  height: 400px;
  transition: all 0.3s;
  overflow: hidden; 
  position: relative; 

  @media screen and (max-width: 992px) {
    max-width: 680px;
    height: 400px;
  }

  @media screen and (max-width: 768px) {
    min-height: 500px;
    height: auto;
    margin: 180px auto;
  }

  @media screen and (max-height: 500px) and (min-width: 992px) {
    height: 350px;
  }

  &__item {
    display: flex;
    align-items: center;
    width: 100%;

    @media screen and (max-width: 768px) {
      flex-direction: column;
    }

    &:not(.swiper-slide-active) {
      .blog-slider__img,
      .blog-slider__content {
        visibility: hidden;
      }
    }

    &.swiper-slide-active {
      .blog-slider__img img {
        opacity: 1;
        transition-delay: 0.3s;
      }

      .blog-slider__content > * {
        opacity: 1;
        transform: none;

        @for $i from 0 to 15 {
          &:nth-child(#{$i + 1}) {
            transition-delay: $i * 0.1 + 0.3s;
          }
        }
      }
    }
  }

  &__img {
    width: 300px;
    flex-shrink: 0;
    height: 300px;
    background-image: linear-gradient(147deg, #bc59c6 0%, #7dc4cc 195%);
    box-shadow: 4px 13px 30px 1px rgba(82, 82, 82, 0.2);
    border-radius: 20px;
    transform: translateX(-80px); // 保留这个变换
    overflow: hidden;
    position: relative;
    z-index: 1;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      opacity: 0;
      border-radius: 20px;
      transition: all 0.3s;
    }

    @media screen and (max-width: 768px) {
      transform: translateY(-50%);
      width: 90%;
    }

    @media screen and (max-width: 576px) {
      width: 95%;
    }
  }

  &__content {
    padding-right: 25px;
    z-index: 0; // 保持内容在下层

    @media screen and (max-width: 768px) {
      margin-top: -80px;
      text-align: center;
      padding: 0 30px;
    }

    @media screen and (max-width: 576px) {
      padding: 0;
    }

    > * {
      opacity: 0;
      transform: translateY(25px);
      transition: all 0.4s;
    }
  }

  &__title {
    font-size: 24px;
    font-weight: 700;
    color: #0d0925;
    margin-bottom: 20px;
  }

  &__text {
    color: #4e4a67;
    margin-bottom: 30px;
    line-height: 1.5em;
  }

  &__button {
    display: inline-flex;
    background-image: linear-gradient(147deg, #f6736b 0%, #934f91 74%);
    padding: 15px 35px;
    border-radius: 50px;
    color: #fff;
    box-shadow: 0px 14px 80px rgba(0, 0, 0, 0.4);
    text-decoration: none;
    font-weight: 500;
    justify-content: center;
    text-align: center;
    letter-spacing: 1px;

    @media screen and (max-width: 576px) {
      width: 100%;
    }
  }

  .swiper-pagination {
    position: absolute; // 改回绝对定位
    bottom: 20px; // 距离底部20px
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;

    .swiper-pagination-bullet {
      width: 10px;
      height: 10px;
      background: #757575;
      opacity: 0.2;
      transition: all 0.3s;

      &-active {
        opacity: 1;
        background: rgb(151, 151, 151);
        height: 20px;
        box-shadow: 0px 0px 20px rgba(156, 156, 156, 0.3);
      }
    }
  }
}

.footer {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  color: white;
  text-align: center;
  padding: 10px 0;
  background: rgba(0, 0, 0, 0.5);
}
</style>
