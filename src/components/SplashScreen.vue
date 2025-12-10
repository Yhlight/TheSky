<template>
  <div class="splash-screen">
    <div class="title">THE SKY</div>
    <div class="description">
      <p>一款探索型游戏，探索程序化生成的世界。</p>
      <p>按 [ENTER] 开始</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['start-game']);

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    emit('start-game');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
});
</script>

<style scoped>
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: 'Cinzel', serif;
}

.title {
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: 15px;
  margin-bottom: 20px;
}

.description {
  font-size: 1.2rem;
  text-align: center;
}
</style>
