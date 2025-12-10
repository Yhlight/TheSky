<template>
  <div id="game-container">
    <SplashScreen v-if="!gameStarted" @start-game="startGame" />
    <Game v-else />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SplashScreen from './components/SplashScreen.vue';
import Game from './components/Game.vue';

const gameStarted = ref(false);

function startGame() {
  gameStarted.value = true;
}
</script>

<style>
/* Global styles can go here */
</style>
