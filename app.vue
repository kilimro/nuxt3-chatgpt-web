<template>
  <div class="app-container">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// 检测是否在iframe中
onMounted(() => {
  if (process.client) {
    const isInIframe = window.self !== window.top
    if (isInIframe) {
      document.body.classList.add('iframe-embedded')
      console.log('检测到iframe嵌入模式')
    }
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>