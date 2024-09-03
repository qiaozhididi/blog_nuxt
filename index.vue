<template>
  <swiper-slide>
    <div class="blog-slider__wrap swiper-wrapper">
      <div
        class="blog-slider__item swiper-slide"
        v-for="(data, index) in details"
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
      <div class="blog-slider__pagination"></div>
    </div>
    <!-- 底部foot 显示copyright -->
    <div
      style="
        position: fixed;
        left: 0;
        bottom: 0;
        width: 100%;
        color: white;
        text-align: center;
        padding: 10px 0;
      "
    >
      Copyright &reg; 2024 All Rights 乔治弟弟.
    </div>
  <swiper-slide/>
</template>

<script lang="ts" setup>
import dataJson from "../public/data/data.json";
import {Swiper,SwiperSlide } from "swiper/vue";
import 'swiper/css';
import { Navigation, Pagination,Mousewheel  } from "swiper/modules";

// 不要一次性渲染整个dataJson当Pagination页面更换才渲染
interface DataItem {
  image: string;
  title: string;
  text: string;
  href: string;
  icon: string;
}
const details = ref<DataItem[]>(dataJson);

// 导入必要的Swiper模块
Swiper.use([Navigation, Pagination]);

const swiperRef = ref<Swiper>();
// 定义Swiper类型
type SwiperOptions = {
  spaceBetween: number;
  effect: string;
  loop: boolean;
  mousewheel: boolean;
  pagination: {
    el: string;
    clickable: boolean;
  };
};
const swiperOptions: SwiperOptions = {
  spaceBetween: 30,
  effect: "coverflow",
  loop: true,
  mousewheel: true,
  pagination: {
    el: ".blog-slider__pagination",
    clickable: true,
  },
};
onMounted(() => {
  // 初始化Swiper实例
  swiperRef.value = new Swiper(".blog-slider", swiperOptions);
});
</script>
<style lang="scss" scoped>
@import url("https://fonts.googleapis.com/css?family=Fira+Sans:400,500,600,700,800");

* {
  box-sizing: border-box;
}
body {
  background-image: linear-gradient(147deg, #bc59c6 0%, #7dc4cc 74%);
  // background-color: #ffe53b;
  min-height: 100vh;
  font-family: "Fira Sans", sans-serif;
  display: flex;
}
.blog-slider {
  width: 95%;
  position: relative;
  max-width: 800px;
  margin: auto;
  background: #fff;
  box-shadow: 0px 14px 80px rgba(34, 35, 58, 0.2);
  padding: 25px;
  border-radius: 25px;
  height: 400px;
  transition: all 0.3s;

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

    @media screen and (max-width: 768px) {
      flex-direction: column;
    }

    &.swiper-slide-active {
      .blog-slider__img {
        img {
          opacity: 1;
          transition-delay: 0.3s;
        }
      }

      .blog-slider__content {
        > * {
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
  }

  &__img {
    // width: 40%;
    width: 300px;
    flex-shrink: 0;
    height: 300px;
    // background-image: linear-gradient(147deg, #bc59c6 0%, #7dc4cc 195%);
    // box-shadow: 4px 13px 30px 1px rgba(82, 82, 82, 0.2);
    border-radius: 20px;
    transform: translateX(-80px);

    overflow: hidden;

    &:after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      // background-image: linear-gradient(147deg, #fe8a39 0%, #fd3838 74%);
      border-radius: 20px;
      opacity: 0.8;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      opacity: 0;
      border-radius: 20px;
      transition: all 0.3s;
    }

    @media screen and (max-width: 992px) {
      // width: 45%;
    }

    @media screen and (max-width: 768px) {
      transform: translateY(-50%);
      width: 90%;
    }

    @media screen and (max-width: 576px) {
      width: 95%;
    }

    @media screen and (max-height: 500px) and (min-width: 992px) {
      height: 270px;
    }
  }

  &__content {
    // width: 60%;
    padding-right: 25px;

    @media screen and (max-width: 992px) {
      // width: 55%;
    }

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

  &__code {
    color: #7b7992;
    margin-bottom: 15px;
    display: block;
    font-weight: 500;
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

  .swiper-container-horizontal > .swiper-pagination-bullets,
  .swiper-pagination-custom,
  .swiper-pagination-fraction {
    bottom: 10px;
    left: 0;
    width: 100%;
  }

  &__pagination {
    position: absolute;
    z-index: 21;
    right: 0px;
    width: 11px !important;
    text-align: center;
    left: auto !important;
    top: 50%;
    bottom: auto !important;
    transform: translateY(-50%);

    @media screen and (max-width: 768px) {
      transform: translateX(-50%);
      left: 50% !important;
      top: 205px;
      width: 100% !important;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    &.swiper-pagination-bullets .swiper-pagination-bullet {
      margin: 8px 0;

      @media screen and (max-width: 768px) {
        margin: 0 5px;
      }
    }

    .swiper-pagination-bullet {
      width: 10px;
      height: 10px;
      display: block;
      border-radius: 10px;
      background: #757575;
      opacity: 0.2;
      transition: all 0.3s;

      &-active {
        opacity: 1;
        background: rgb(151, 151, 151);
        height: 20px;
        box-shadow: 0px 0px 20px rgba(156, 156, 156, 0.3);

        @media screen and (max-width: 768px) {
          height: 11px;
          width: 30px;
        }
      }
    }
  }
}
</style>
