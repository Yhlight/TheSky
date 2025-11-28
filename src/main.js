const { createApp, ref, onMounted, onUnmounted } = Vue;

const app = createApp({
  setup() {
    const crystalX = ref(10);
    const crystalY = ref(50);
    const isMoving = ref(false);
    const isAutoMoving = ref(false);
    const trail = ref([]);
    const speedMultiplier = ref(1);
    const scenes = [
      { name: 'Spring', backgroundColor: '#d1fecb', particleChar: '🌸', particleColor: '#ff8fab' },
      { name: 'Summer', backgroundColor: '#fff9c4', particleChar: '☀️', particleColor: '#ffeb3b' },
      { name: 'Autumn', backgroundColor: '#ffccbc', particleChar: '🍁', particleColor: '#ff7043' },
      { name: 'Winter', backgroundColor: '#e0f7fa', particleChar: '❄️', particleColor: '#ffffff' },
      { name: 'Starry Night', backgroundColor: '#001a33', particleChar: '*', particleColor: '#ffffff' },
      { name: 'Desert', backgroundColor: '#f0e68c', particleChar: '…', particleColor: '#c2b280' }
    ];
    const currentSceneIndex = ref(0);
    const sceneParticles = ref([]);
    let keydownTimeout = null;
    let animationFrameId = null;
    let lastTrailTime = 0;

    const currentScene = ref(scenes[currentSceneIndex.value]);

    const moveRight = () => {
      if (crystalX.value < 90) {
        crystalX.value += 0.17 * speedMultiplier.value;
      } else {
        crystalX.value = 10; // Loop back
        currentSceneIndex.value = (currentSceneIndex.value + 1) % scenes.length;
        currentScene.value = scenes[currentSceneIndex.value];
        createSceneParticles();
      }
    };

    const updateTrail = () => {
        trail.value.push({ x: crystalX.value, y: crystalY.value, opacity: 1 });
        trail.value.forEach(p => p.opacity -= 0.05);
        trail.value = trail.value.filter(p => p.opacity > 0);
    }

    const updateSceneParticles = () => {
        sceneParticles.value.forEach(p => {
            p.y += p.speed * speedMultiplier.value;
            if (p.y > 100) {
                p.y = 0;
                p.x = Math.random() * 100;
            }
        });
    };

    const gameLoop = (timestamp) => {
        if (isMoving.value) {
            moveRight();
            if (timestamp - lastTrailTime > 50) { // Throttle trail generation
                updateTrail();
                lastTrailTime = timestamp;
            }
        }
        updateSceneParticles();
        animationFrameId = requestAnimationFrame(gameLoop);
    };

    const startMoving = () => {
      if (isMoving.value) return;
      isMoving.value = true;
    };

    const stopMoving = () => {
      isMoving.value = false;
      isAutoMoving.value = false;
      speedMultiplier.value = 1;
      clearTimeout(keydownTimeout);
      keydownTimeout = null;
    };

    const handleKeyDown = (e) => {
      if (e.key === 'd' || e.key === 'D' || e.code === 'Space') {
        if (isAutoMoving.value) {
            stopMoving();
            return;
        }
        if (isMoving.value) return;

        startMoving();
        keydownTimeout = setTimeout(() => {
            isAutoMoving.value = true;
            speedMultiplier.value = 3;
        }, 3000);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'd' || e.key === 'D' || e.code === 'Space') {
        if (isAutoMoving.value) return;
        stopMoving();
      }
    };

    const createSceneParticles = () => {
        sceneParticles.value = [];
        for (let i = 0; i < 50; i++) {
            sceneParticles.value.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                char: currentScene.value.particleChar,
                speed: Math.random() * 0.5 + 0.1,
                color: currentScene.value.particleColor
            });
        }
    };

    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      createSceneParticles();
      gameLoop(0);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    });

    return {
      crystalX,
      crystalY,
      trail,
      currentScene,
      sceneParticles
    };
  },
  template: `
    <div
      class="scene"
      :style="{ backgroundColor: currentScene.backgroundColor }"
    >
        <div
            class="particle"
            v-for="(particle, index) in sceneParticles"
            :key="index"
            :style="{ left: particle.x + '%', top: particle.y + '%', color: particle.color }"
        >
            {{ particle.char }}
        </div>
    </div>
    <div
      class="crystal"
      :style="{ left: crystalX + '%', top: crystalY + '%' }"
    ></div>
    <div
      class="trail"
      v-for="(particle, index) in trail"
      :key="index"
      :style="{ left: particle.x + '%', top: particle.y + '%', opacity: particle.opacity }"
    ></div>
  `
});

app.mount('#app');
