/**
 * ASCENSION ENGINE 3.0: CINEMATIC FLOW
 * 核心升级点：Smoothstep过渡，速度动态控制，Lighter模式拖尾
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const uiName = document.getElementById('scene-name');

let w, h;
let animationFrameId = null; // 用于暂停/恢复
let lastTimestamp = 0;
let isPaused = false;

// --- 场景定义 (THEMES) ---
// 颜色格式为 HEX
const THEMES = [
    {
        name: "SPRING AWAKENING",
        sky: ['#64b5f6', '#e91e63'], // 天空蓝更柔和
        sun: '#fff9c4', sunSize: 70, sunY: 0.3, // 太阳淡黄
        mountFar: '#a5d6a7', mountNear: '#81c784',
        ground: '#66bb6a', // 更鲜嫩的绿色
        accent: '#ffffff',
        fogColor: '#f8bbd0', fogAlpha: 0.1,
        propType: 'grass',
        terrainStyle: 'mountain',
        weather: 'rain'
    },
    {
        name: "GOLDEN RADIANCE",
        sky: ['#ffb74d', '#ff9800'],
        sun: '#fffde7', sunSize: 120, sunY: 0.4, // 更亮更耀眼的太阳
        mountFar: '#bcaaa4', mountNear: '#8d6e63',
        ground: '#795548',
        accent: '#fff3e0',
        fogColor: '#ffecb3', fogAlpha: 0.15,
        propType: 'ruins',
        terrainStyle: 'mountain',
        weather: 'windy'
    },
    {
        name: "STARLIGHT VOID",
        sky: ['#00003f', '#2c2c54'], // 更深邃的太空
        sun: '#ffffff', sunSize: 30, sunY: 0.25, // 月亮/远星
        mountFar: '#303f9f', mountNear: '#3f51b5',
        ground: '#1a237e',
        accent: '#e3f2fd', // 更亮的星星
        fogColor: '#5c6bc0', fogAlpha: 0.1,
        propType: 'crystals',
        terrainStyle: 'jagged',
        weather: 'none'
    },
    {
        name: "AUTUMN EMBRACE",
        sky: ['#ffab91', '#e65100'],
        sun: '#fff3e0', sunSize: 70, sunY: 0.35,
        mountFar: '#bcaaa4', mountNear: '#a1887f',
        ground: '#8d6e63',
        accent: '#ffecb3',
        fogColor: '#ffd180', fogAlpha: 0.18,
        propType: 'leaf',
        terrainStyle: 'mountain',
        weather: 'windy'
    },
    {
        name: "AZURE DREAM",
        sky: ['#4dd0e1', '#0097a7'], // 更青色的天空
        sun: '#e0f7fa', sunSize: 80, sunY: 0.2,
        mountFar: '#b2ebf2', mountNear: '#80deea',
        ground: '#006064', // 更深邃的水面
        accent: '#ffffff',
        fogColor: '#80deea', fogAlpha: 0.2,
        propType: 'bubbles',
        terrainStyle: 'ocean',
        weather: 'none'
    },
    {
        name: "NEON GRID",
        sky: ['#000000', '#5e35b1'],
        sun: '#f06292', sunSize: 90, sunY: 0.5,
        mountFar: '#283593', mountNear: '#1a237e', // 更深的背景
        ground: '#12005e',
        accent: '#ff4081', // 更亮的霓虹
        fogColor: '#3949ab', fogAlpha: 0.15,
        propType: 'skyscrapers',
        terrainStyle: 'cityscape',
        weather: 'rain'
    },
    {
        name: "FROZEN WASTELAND",
        sky: ['#b0bec5', '#78909c'], // 更冷的灰色
        sun: '#f5f5f5', sunSize: 50, sunY: 0.2,
        mountFar: '#cfd8dc', mountNear: '#b0bec5',
        ground: '#eceff1',
        accent: '#ffffff', // 冰晶反光
        fogColor: '#cfd8dc', fogAlpha: 0.35, // 更浓的雾
        propType: 'none',
        terrainStyle: 'jagged',
        weather: 'snow'
    }
];

// --- 配置 ---
const CFG = {
    playerMinSpeed: 1.5,    // 基础巡航速度 (风力可能使其低于此值)
    playerMaxSpeed: 20,      // 大幅提高最大速度
    playerThrust: 0.1,       // 更强的推力
    dragCoefficient: 0.98,   // 略微增加阻力以控制高速
    windForceScale: 0.1,
    hoverForce: 0.01,
    hoverDamping: 0.95,
    transitionFrames: 350,
    terrainBaseY: 0.9,
    playerInitialX: 0.2,

    // --- 新增：地形区块配置 ---
    CHUNK_WIDTH: 1000,       // 每个地形区块的宽度（像素）
    CHUNK_RESOLUTION: 20,    // 每个区块的点数（越高越平滑）
    TERRAIN_LAYERS: 3,       // 地形层数 (修正)
    PRE_GENERATION_RANGE: 2, // 提前生成多少个区块
};

// --- 状态管理 ---
const state = {
    t: 0, // 全局时间
    worldScrollX: 0, // 累积的世界滚动距离
    isAccelerating: false, // 是否正在加速

    currentThemeIdx: 0,
    nextThemeIdx: 1,
    transitionTimer: 0,
    transitionProgress: 0, // 0-1 的过渡进度
    isFadingOut: false, // UI淡出状态

    player: {
        x: 0, y: 0,
        velocity: { x: CFG.playerMinSpeed, y: 0 },
        acceleration: { x: 0, y: 0 },
        trail: []
    },

    props: [],
    particles: [],

    // --- 新增：地形状态 ---
    terrain: {
        chunks: new Map(),       // 用于存储地形区块数据 { chunkId -> chunkData }
        lastGeneratedChunkId: -1 // 记录最后一个已生成的区块ID
    },

    // --- 新增：天气状态 ---
    weatherParticles: [],

    // --- 新增：NPC状态 ---
    npcs: []
};

// --- 辅助函数 ---
const lerp = (a, b, t) => a + (b - a) * t;

// 非线性缓动函数 (Smoothstep: 3t^2 - 2t^3)
const smoothstep = (t) => t * t * (3 - 2 * t);

// HEX颜色转RGB数组
const hexToRgb = (hex) => {
    let bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
// 颜色插值，返回RGB字符串
const lerpColor = (c1, c2, t) => {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    const r = Math.round(lerp(rgb1[0], rgb2[0], t));
    const g = Math.round(lerp(rgb1[1], rgb2[1], t));
    const b = Math.round(lerp(rgb1[2], rgb2[2], t));
    return `rgb(${r},${g},${b})`;
}
const random = (min, max) => Math.random() * (max - min) + min;

// --- Value Noise (用于更自然的地形) ---
class ValueNoise {
    constructor(seed = Math.random()) {
        this.seed = seed;
        this.values = new Array(256).fill(0).map(() => Math.random());
    }

    // 平滑插值 (Cosine)
    cosineInterpolate(a, b, t) {
        const ft = t * Math.PI;
        const f = (1 - Math.cos(ft)) * 0.5;
        return a * (1 - f) + b * f;
    }

    // 获取噪声值
    get(x) {
        const intX = Math.floor(x);
        const fracX = x - intX;

        const v1 = this.values[intX & 255];
        const v2 = this.values[(intX + 1) & 255];

        return this.cosineInterpolate(v1, v2, fracX);
    }
}
const terrainNoise = new ValueNoise();
const windNoiseX = new ValueNoise(Math.random());
const windNoiseY = new ValueNoise(Math.random());


// --- 初始化 ---
function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    state.player.x = w * CFG.playerInitialX;
    state.player.y = h * 0.5;
}
window.addEventListener('resize', resize);
resize();

// --- 核心交互与循环 ---

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'KeyD') state.isAccelerating = true;
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'KeyD') state.isAccelerating = false;
});
window.addEventListener('mousedown', () => state.isAccelerating = true);
window.addEventListener('mouseup', () => state.isAccelerating = false);
window.addEventListener('touchstart', (e) => { e.preventDefault(); state.isAccelerating = true; }, { passive: false });
window.addEventListener('touchend', (e) => { e.preventDefault(); state.isAccelerating = false; });


// --- 游戏循环与暂停/恢复 ---
function gameLoop(timestamp) {
    if (isPaused) {
        lastTimestamp = timestamp; // 存储暂停时的时刻
        return;
    }

    // --- 新增: 基于DeltaTime的平滑更新 ---
    // 计算增量时间 (delta time)
    let deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // 防止因浏览器标签页切换等原因导致的deltaTime过大，避免画面跳跃
    if (deltaTime > 100) {
        deltaTime = 16.667; // 使用一个接近60FPS的值作为安全回退
    }


    update(deltaTime, timestamp); // 传递deltaTime和timestamp
    draw(timestamp);   // draw函数仍然可以使用原始时间戳用于一些与物理无关的动画

    animationFrameId = requestAnimationFrame(gameLoop);
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        isPaused = true;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else {
        isPaused = false;
        // 立即开始新的循环，而不是等待下一帧
        if (!animationFrameId) {
            lastTimestamp = performance.now(); // 重置时间戳以避免大的跳跃
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }
});


function update(deltaTime, timestamp) {
    const dt = deltaTime / (1000 / 60); // 时间缩放因子，目标为60FPS
    state.t++; // 仍然保留 t 用于一些基于帧的简单动画

    // --- 1. 新物理模型：施加力 ---
    const p = state.player;
    p.acceleration = { x: 0, y: 0 }; // 每帧重置加速度

    // a) 玩家推力
    if (state.isAccelerating) {
        p.acceleration.x += CFG.playerThrust;
    }

    // b) 风力 (持续变化, 使用原始timestamp)
    const windX = (windNoiseX.get(timestamp / 800) - 0.5) * 2; // -1 to 1
    const windY = (windNoiseY.get(timestamp / 600) - 0.5) * 2;  // -1 to 1
    p.acceleration.x += windX * CFG.windForceScale;
    p.acceleration.y += windY * CFG.windForceScale;

    // c) 悬浮/回中力 (使其保持在屏幕中央)
    const hoverTargetY = h / 2;
    const displacementY = hoverTargetY - p.y;
    p.acceleration.y += displacementY * CFG.hoverForce;

    // --- 2. 更新速度和位置 (使用dt保证帧率无关) ---
    // a) 根据加速度更新速度
    p.velocity.x += p.acceleration.x * dt;
    p.velocity.y += p.acceleration.y * dt;

    // b) 应用阻力 (帧率无关)
    p.velocity.x *= Math.pow(CFG.dragCoefficient, dt);
    p.velocity.y *= Math.pow(CFG.hoverDamping, dt); // 垂直方向使用不同的阻尼

    // c) 限制最大/最小速度
    p.velocity.x = Math.min(p.velocity.x, CFG.playerMaxSpeed);

    // 确保速度不会过低，除非被风吹 (帧率无关)
    if (!state.isAccelerating && p.velocity.x < CFG.playerMinSpeed) {
        p.velocity.x = lerp(p.velocity.x, CFG.playerMinSpeed, 1 - Math.pow(1 - 0.05, dt));
    }

    // *** 关键修复：绝不后退 ***
    p.velocity.x = Math.max(0, p.velocity.x);

    // d) 累积世界滚动距离
    state.worldScrollX += p.velocity.x * dt;

    // e) 根据速度更新位置
    p.y += p.velocity.y * dt;

    // 修正玩家的横向位置，使其感觉在“前进”而不是“移动”
    const speedProgress = Math.max(0, p.velocity.x / CFG.playerMaxSpeed);
    let targetX = w * CFG.playerInitialX + lerp(0, w * 0.15, speedProgress);

    // 新逻辑：确保玩家在屏幕上的 X 位置永远不会减少 (帧率无关)
    if (targetX > p.x) {
        p.x = lerp(p.x, targetX, 1 - Math.pow(1 - 0.02, dt));
    }
    // 如果 targetX <= p.x (减速时发生)，我们什么都不做。
    // 这会使玩家角色在屏幕上保持其最远的推进位置，从而避免了“背景回退”的视觉问题。

    // e) 边界检查
    if (p.y < h * 0.1) { p.y = h * 0.1; p.velocity.y *= -0.5; } // 碰撞反弹
    if (p.y > h * 0.9) { p.y = h * 0.9; p.velocity.y *= -0.5; }

    // --- 3. 更新拖尾 ---
    state.player.trail.push({ x: state.player.x, y: state.player.y, speed: state.player.velocity.x });
    const maxTrailLength = 3 + Math.floor(state.player.velocity.x * 1.5); // 拖尾长度随速度变化
    if (state.player.trail.length > maxTrailLength) state.player.trail.shift();

    // --- 3. 场景导演与过渡 (基于时间) ---
    const THEME_DURATION_MS = 15000;
    const TRANSITION_DURATION_MS = 5000;
    const TRANSITION_START_TIME = THEME_DURATION_MS - TRANSITION_DURATION_MS;

    state.transitionTimer += deltaTime;

    // 检查是否应该开始UI淡出
    if (state.transitionTimer >= TRANSITION_START_TIME && !state.isFadingOut) {
        uiName.style.opacity = 0;
        state.isFadingOut = true;
    }

    // 计算过渡进度
    if (state.transitionTimer >= TRANSITION_START_TIME) {
        const rawProgress = (state.transitionTimer - TRANSITION_START_TIME) / TRANSITION_DURATION_MS;
        // 关键：这里不再缓存混合后的地形，所以进度必须实时计算并传递给渲染函数
        state.transitionProgress = smoothstep(Math.max(0, Math.min(1, rawProgress)));
    } else {
        state.transitionProgress = 0; // 不在过渡期间，进度为0
    }

    // 当一个主题的完整持续时间结束后
    if (state.transitionTimer > THEME_DURATION_MS) {
        state.transitionTimer = 0;
        state.currentThemeIdx = state.nextThemeIdx;
        state.nextThemeIdx = (state.currentThemeIdx + 1) % THEMES.length;

        // 更新文本并淡入
        uiName.innerText = THEMES[state.currentThemeIdx].name;
        uiName.style.opacity = 0.9;
        state.isFadingOut = false; // 重置淡出状态
        state.transitionProgress = 0; // 重置进度
    }

    // 4. 世界生成
    generateWorldEntities();
    updateTerrain();
    updateWeather();
    updateNpcs(); // <-- 新增：调用NPC更新逻辑
}

// --- 新增：NPC系统 ---
function updateNpcs() {
    // 更新NPC位置并清理
    state.npcs.forEach(npc => {
        npc.worldX += npc.vx;
        npc.y += Math.sin(npc.worldX / npc.waveFreq) * npc.waveAmp;
    });

    state.npcs = state.npcs.filter(npc => {
        const screenX = npc.worldX - state.worldScrollX;
        return screenX > -100; // 在屏幕左侧100px外清理
    });
}


// --- 新增：天气系统 ---
function updateWeather() {
    // 1. 清理死去的粒子
    state.weatherParticles = state.weatherParticles.filter(p => p.life > 0);

    // 2. 获取当前天气类型
    const theme = THEMES[state.currentThemeIdx];
    const weatherType = theme.weather;
    if (weatherType === 'none') return;

    // 3. 生成新粒子
    const density = { rain: 0.5, snow: 0.1, windy: 0.3 };
    if (Math.random() < (density[weatherType] || 0)) {
        const p = {
            x: random(0, w),
            y: -10,
            life: 1,
            type: weatherType
        };

        if (weatherType === 'rain') {
            p.vx = 2 + state.player.velocity.x * 0.1;
            p.vy = random(15, 25);
        } else if (weatherType === 'snow') {
            p.vx = random(-1, 1) + state.player.velocity.x * 0.05;
            p.vy = random(1, 3);
            p.size = random(1, 4);
        } else if (weatherType === 'windy') {
            p.x = w + 20;
            p.y = random(0, h);
            p.vx = state.player.velocity.x * 1.5 + random(5, 10);
            p.vy = 0;
        }
        state.weatherParticles.push(p);
    }

    // 4. 更新粒子位置
    state.weatherParticles.forEach(p => {
        p.x -= p.vx;
        p.y += p.vy;
        p.life -= 0.005;

        // 雪花左右飘动
        if (p.type === 'snow') {
            p.x += Math.sin(p.y / 50);
        }

        // 回收离开屏幕的粒子
        if (p.y > h + 20 || p.x < -20) {
            p.life = 0;
        }
    });
}


// --- 新增：地形管理 ---
function getTerrainLayerProperties(layerIndex) {
    // 定义每一层地形的视觉属性
    const properties = [
        { speedScale: 0.2, amp: 120, base: h * 0.65, freq: 0.002, noiseScale: 1.0 }, // mountFar
        { speedScale: 0.4, amp: 100, base: h * 0.75, freq: 0.004, noiseScale: 1.2 }, // mountNear
        { speedScale: 1.0, amp: 30,  base: h * CFG.terrainBaseY, freq: 0.005, isGround: true } // ground
    ];
    return properties[layerIndex];
}

function generateNoiseValue(x, style, prop) {
    let noiseVal = 0;
    const scroll = x * prop.speedScale * 0.01;

    // 地面层使用不同的算法
    if (prop.isGround) {
        switch (style) {
            case 'ocean':
                return prop.base + Math.sin(x * prop.freq * 1.5) * prop.amp * 0.8 + Math.cos(x * prop.freq * 0.5) * prop.amp * 0.5;
            case 'cityscape':
                 const buildingCluster = Math.floor(x / 200);
                 const noise = terrainNoise.get(buildingCluster * 0.5);
                 if (noise > 0.4) {
                     return prop.base - Math.pow(noise, 3) * prop.amp * 2;
                 }
                 return prop.base;
            default: // mountain, jagged, etc.
                return prop.base + Math.sin(x * prop.freq) * prop.amp;
        }
    }

    // 背景山脉层
    switch (style) {
        case 'ocean':
            noiseVal = terrainNoise.get(x * prop.freq * 0.5 + scroll) * prop.amp * 0.5;
            noiseVal += Math.sin(x * prop.freq * 0.1 + scroll) * prop.amp * 0.3;
            break;
        case 'cityscape':
            const cluster = Math.floor(x / 150);
            noiseVal = Math.pow(terrainNoise.get(cluster * 0.2 + scroll), 2) * prop.amp;
            break;
        case 'jagged':
            noiseVal = (1 - Math.abs(terrainNoise.get(x * prop.freq + scroll) * 2 - 1)) * prop.amp;
            noiseVal += (1- Math.abs(terrainNoise.get(x * prop.freq * 2.5 + scroll + 17) * 2 - 1)) * (prop.amp * 0.4);
            break;
        case 'mountain':
        default:
            noiseVal = terrainNoise.get(x * prop.freq + scroll) * prop.amp;
            noiseVal += terrainNoise.get(x * prop.freq * 2.5 + scroll + 17) * (prop.amp * 0.4);
            break;
    }
    return prop.base - noiseVal;
}


function generateTerrainChunk(chunkId) {
    if (state.terrain.chunks.has(chunkId)) return;

    const theme1 = THEMES[state.currentThemeIdx];
    const theme2 = THEMES[state.nextThemeIdx];
    // !! 移除 progress，因为混合将在渲染时进行

    const chunk = {
        id: chunkId,
        worldX: chunkId * CFG.CHUNK_WIDTH,
        layers: []
    };
    const step = CFG.CHUNK_WIDTH / CFG.CHUNK_RESOLUTION;

    for (let i = 0; i < CFG.TERRAIN_LAYERS; i++) {
        const layerData = [];
        const prop = getTerrainLayerProperties(i);

        for (let j = 0; j <= CFG.CHUNK_RESOLUTION; j++) {
            const x = chunk.worldX + j * step;

            // 分别为当前和下一个主题生成并存储地形数据
            const y1 = generateNoiseValue(x, theme1.terrainStyle, prop);
            const y2 = generateNoiseValue(x, theme2.terrainStyle, prop);

            // 存储两个值，而不是混合后的值
            layerData.push({ y1, y2 });
        }
        chunk.layers.push(layerData);
    }

    state.terrain.chunks.set(chunkId, chunk);
}


function updateTerrain() {
    const currentChunkId = Math.floor(state.worldScrollX / CFG.CHUNK_WIDTH);
    const visibleEndChunkId = Math.floor((state.worldScrollX + w) / CFG.CHUNK_WIDTH);

    // 1. 生成前方和当前可见的区块
    for (let id = currentChunkId; id <= visibleEndChunkId + CFG.PRE_GENERATION_RANGE; id++) {
        if (id > state.terrain.lastGeneratedChunkId) {
            generateTerrainChunk(id);
            state.terrain.lastGeneratedChunkId = id;
        }
    }

    // 2. 清理已经远去的区块
    const cleanupThreshold = currentChunkId - 3; // 清理3个区块之后的所有区块
    for (const chunkId of state.terrain.chunks.keys()) {
        if (chunkId < cleanupThreshold) {
            state.terrain.chunks.delete(chunkId);
            // console.log(`Cleaned up chunk ${chunkId}`);
        }
    }
}


function generateWorldEntities() {
    // 根据速度调整生成密度
    const speedRange = CFG.playerMaxSpeed - CFG.playerMinSpeed;
    const speedProgress = speedRange > 0 ? (state.player.velocity.x - CFG.playerMinSpeed) / speedRange : 0;
    const particleDensity = lerp(0.05, 0.3, speedProgress);

    // Props (相对稀疏)
    if (Math.random() < 0.015) {
        // *** 混合生成道具 ***
        const T1 = THEMES[state.currentThemeIdx];
        const T2 = THEMES[state.nextThemeIdx];
        const propTheme = (Math.random() < state.transitionProgress) ? T2 : T1;

        if (propTheme.propType !== 'none') {
            state.props.push({
                worldX: state.worldScrollX + w + 100, // 使用世界坐标
                y: h * CFG.terrainBaseY - random(50, 150),
                type: propTheme.propType,
                scale: random(0.8, 1.5),
                rot: random(0, Math.PI * 2)
            });
        }
    }

    // Particles (密集且受速度影响)
    if (Math.random() < particleDensity) {
        state.particles.push({
            x: w + 10,
            y: random(0, h),
            vx: -random(state.player.velocity.x * 0.8, state.player.velocity.x * 1.2),
            vy: random(-1, 1),
            life: 1,
            size: random(1, 3),
            type: THEMES[state.currentThemeIdx].propType
        });
    }

    // 更新实体位置和清理
    // 道具现在基于世界坐标，所以我们只在这里过滤掉离开屏幕的
    state.props = state.props.filter(p => {
        const screenX = p.worldX - state.worldScrollX;
        return screenX > -200; // 屏幕左侧200像素外
    });

    // 使用反向循环安全地在迭代时移除粒子
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * lerp(1, 1.5, (state.player.velocity.x / CFG.playerMaxSpeed));
        p.y += p.vy;
        p.life -= 0.01 + state.player.velocity.x * 0.001;

        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }

    // --- 新增：NPC 生成 ---
    if (Math.random() < 0.005 && state.npcs.length < 5) { // 较低的生成概率，并限制最大数量
        state.npcs.push({
            worldX: state.worldScrollX + w + 200, // 在屏幕右侧生成
            y: random(h * 0.2, h * 0.8),
            vx: random(CFG.playerMinSpeed * 0.8, CFG.playerMaxSpeed * 0.6), // 速度比玩家稍慢
            waveAmp: random(0.1, 0.5), // 振幅
            waveFreq: random(50, 150) // 频率
        });
    }
}

function draw(timestamp) {
    const progress = state.transitionProgress;

    const T1 = THEMES[state.currentThemeIdx];
    const T2 = THEMES[state.nextThemeIdx];

    // 混合颜色配置
    const C = {
        skyTop: lerpColor(T1.sky[0], T2.sky[0], progress),
        skyBot: lerpColor(T1.sky[1], T2.sky[1], progress),
        sun: lerpColor(T1.sun, T2.sun, progress),
        mountFar: lerpColor(T1.mountFar, T2.mountFar, progress),
        mountNear: lerpColor(T1.mountNear, T2.mountNear, progress),
        ground: lerpColor(T1.ground, T2.ground, progress),
        accent: lerpColor(T1.accent, T2.accent, progress),
        fogColor: lerpColor(T1.fogColor, T2.fogColor, progress),
        sunSize: lerp(T1.sunSize, T2.sunSize, progress),
        sunY: lerp(T1.sunY, T2.sunY, progress),
        fogAlpha: lerp(T1.fogAlpha, T2.fogAlpha, progress)
    };

    // --- 1. 天空背景 ---
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, C.skyTop);
    grad.addColorStop(1, C.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // --- 2. 太阳/月亮 (Bloom Glow) ---
    ctx.save();
    const sunX = w * 0.8;
    const sunY = h * C.sunY; // 使用插值后的 Y 坐标

    ctx.globalCompositeOperation = 'screen';
    const safeR0 = Math.max(1, C.sunSize / 2);
    const safeR1 = Math.max(2, C.sunSize * 5);
    const sunGrad = ctx.createRadialGradient(sunX, sunY, safeR0, sunX, sunY, safeR1);
    sunGrad.addColorStop(0, C.sun);
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);

    // 本体
    ctx.fillStyle = C.sun;

    // >>> 关键修复点：确保 sunSize 至少为 1，避免负数错误
    const safeSunSize = Math.max(1, C.sunSize);
    ctx.beginPath();
    ctx.arc(sunX, sunY, safeSunSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // --- 3. 多层视差地形 (从区块绘制) ---
    drawTerrainLayerFromChunks(ctx, C.mountFar, 0, progress);
    drawTerrainLayerFromChunks(ctx, C.mountNear, 1, progress);

    // --- NEW: 4. 体积雾/柔光层 ---
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = C.fogColor;
    ctx.globalAlpha = C.fogAlpha; // 使用插值后的 Alpha
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over'; // 重置混合模式
    ctx.globalAlpha = 1.0; // 重置透明度

    // --- 5. 远景粒子 (速度线) ---
    drawParticles(ctx, C, 0.5); // 远景粒子更透明，产生速度线效果

    // --- 5. 地面和前景 ---
    drawGroundAndProps(ctx, C, progress);

    // --- 6. 玩家 (光之丝带) ---
    drawPlayer(ctx, C);

    // --- 6. 绘制NPCs ---
    drawNpcs(ctx, C);

    // --- 7. 玩家 (光之丝带) ---
    drawPlayer(ctx, C);

    // --- 8. 前景粒子 ---
    drawParticles(ctx, C, 1.0); // 前景粒子最清晰

    // --- 9. 天气效果 ---
    drawWeather(ctx, C);

    ctx.globalCompositeOperation = 'source-over';
}

// --- 新增：NPC绘制 ---
function drawNpcs(ctx, C) {
    ctx.save();
    ctx.fillStyle = C.accent;

    state.npcs.forEach(npc => {
        const screenX = npc.worldX - state.worldScrollX;

        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(screenX, npc.y);
        ctx.lineTo(screenX - 10, npc.y - 4);
        ctx.lineTo(screenX - 10, npc.y + 4);
        ctx.closePath();
        ctx.fill();
    });

    ctx.restore();
}


// --- 新增：天气系统绘制 ---
function drawWeather(ctx, C) {
    ctx.save();
    state.weatherParticles.forEach(p => {
        if (p.type === 'rain') {
            ctx.strokeStyle = 'rgba(174, 194, 224, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx, p.y - p.vy);
            ctx.stroke();
        } else if (p.type === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'windy') {
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.life * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - 10, p.y);
            ctx.stroke();
        }
    });
    ctx.restore();
}


// --- 新增：从区块数据绘制地形层 ---
function drawTerrainLayerFromChunks(ctx, color, layerIndex, progress) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);

    const startChunkId = Math.floor(state.worldScrollX / CFG.CHUNK_WIDTH);
    const endChunkId = Math.floor((state.worldScrollX + w) / CFG.CHUNK_WIDTH);
    const step = CFG.CHUNK_WIDTH / CFG.CHUNK_RESOLUTION;

    for (let id = startChunkId; id <= endChunkId; id++) {
        const chunk = state.terrain.chunks.get(id);
        if (!chunk) continue;

        const layerData = chunk.layers[layerIndex];
        if (!layerData) continue;

        for (let i = 0; i < layerData.length; i++) {
            const pointData = layerData[i];
            const screenX = chunk.worldX + i * step - state.worldScrollX;

            // 实时混合
            const y = lerp(pointData.y1, pointData.y2, progress);

            ctx.lineTo(screenX, y);
        }
    }

    ctx.lineTo(w, h);
    ctx.fill();
}


// --- 道具绘制逻辑 (模块化) ---
const PROP_DRAWERS = {
    'grass': (ctx, C, p) => {
        ctx.fillStyle = C.ground;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-2, -random(10, 20));
        ctx.lineTo(0, -random(5, 15));
        ctx.lineTo(2, -random(10, 20));
        ctx.closePath();
        ctx.fill();
    },
    'ruins': (ctx, C, p) => {
        ctx.fillStyle = C.mountNear;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-15, -80, 30, 80);
    },
    'crystals': (ctx, C, p) => {
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-10, -30); ctx.lineTo(0, -50); ctx.lineTo(10, -30);
        ctx.fill();
    },
    'leaf': (ctx, C, p) => {
        // 模拟飘落的叶子
        ctx.fillStyle = `rgba(220, 120, 50, 0.7)`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(10, 5, 15, 15);
        ctx.quadraticCurveTo(5, 10, 0, 0);
        ctx.fill();
    },
    // --- 新增道具绘制占位符 ---
    'bubbles': (ctx, C, p) => {
        ctx.strokeStyle = C.accent;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.stroke();
    },
    'skyscrapers': (ctx, C, p) => {
        ctx.fillStyle = C.mountNear;
        ctx.globalAlpha = 0.8;
        const width = random(20, 50);
        const height = random(80, 250);
        ctx.fillRect(-width / 2, -height, width, height);
    }
};

// 绘制地面和装饰物
function drawGroundAndProps(ctx, C, progress) {
    // --- 从区块绘制地面 ---
    drawTerrainLayerFromChunks(ctx, C.ground, 2, progress); // 2是地面的图层索引

    // 地面高光
    // (注意: 这个高光效果暂时简化，因为精确重现需要额外计算)
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    // ctx.stroke(); // 暂时禁用，以避免视觉错误

    // 装饰物 (Props)
    state.props.forEach(p => {
        const drawer = PROP_DRAWERS[p.type];
        if (!drawer) return;

        const x = p.worldX - state.worldScrollX;

        // 从缓存中获取精确的地面高度 (实时混合)
        const chunkId = Math.floor(p.worldX / CFG.CHUNK_WIDTH);
        const chunk = state.terrain.chunks.get(chunkId);
        let groundY = h * CFG.terrainBaseY;
        if (chunk) {
            const xInChunk = p.worldX - chunk.worldX;
            const pointIndex = Math.round(xInChunk / (CFG.CHUNK_WIDTH / CFG.CHUNK_RESOLUTION));
            const pointData = chunk.layers[2]?.[pointIndex];
            if (pointData) {
                groundY = lerp(pointData.y1, pointData.y2, progress);
            }
        }

        ctx.save();
        ctx.translate(x, groundY);
        ctx.scale(p.scale, p.scale);
        ctx.rotate(p.rot);

        ctx.shadowBlur = 10;
        ctx.shadowColor = C.accent;

        // 调用专属的绘制函数
        drawer(ctx, C, p);

        ctx.restore();
    });
}

// 绘制玩家 (光之子)
function drawPlayer(ctx, C) {
    const p = state.player;

    // 1. 拖尾 (使用 Lighter 模式，实现真正的光线叠加)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // 关键：叠加光线

    if (p.trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);

        for (let i = 1; i < p.trail.length - 1; i++) {
            const point = p.trail[i];
            const nextPoint = p.trail[i + 1];

            // 确保线宽不会小于 0.5。这是修复 IndexSizeError 的关键。
            const lineWidth = Math.max(0.5, 4 + p.trail[i].speed * 0.8);

            // 贝塞尔曲线平滑连接
            const xc = (point.x + nextPoint.x) / 2;
            const yc = (point.y + nextPoint.y) / 2;
            ctx.quadraticCurveTo(point.x, point.y, xc, yc);

            // 越靠近尾巴，光线越柔和
            const alpha = i / p.trail.length;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            ctx.lineWidth = lineWidth; // 使用安全的线宽
            ctx.stroke();
        }
    }
    ctx.restore();

    // 2. 角色本体 (核心发光体)
    ctx.save();
    ctx.translate(p.x, p.y);

    // 根据垂直速度旋转
    const angle = Math.atan2(p.velocity.y, 20); // 20 是一个魔数，用于控制旋转的灵敏度
    ctx.rotate(angle);

    // 强烈的辉光
    ctx.shadowBlur = 50;
    ctx.shadowColor = 'white';

    // 绘制深色核心以增加对比度
    ctx.fillStyle = 'rgba(0, 0, 50, 0.25)';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-18, -12);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-18, 12);
    ctx.closePath();
    ctx.fill();

    // 绘制明亮的晶体形状
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.moveTo(15, 0); // 尖端
    ctx.lineTo(-15, -10); // 左翼
    ctx.lineTo(-10, 0); // 尾部中心
    ctx.lineTo(-15, 10); // 右翼
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// 绘制粒子
function drawParticles(ctx, C, alphaScale) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = C.accent;

    state.particles.forEach(p => {
        ctx.globalAlpha = p.life * alphaScale;
        // 速度越快，粒子被拉伸越长（视觉加速效果）
        const length = 1 + p.size * (state.player.velocity.x / CFG.playerMaxSpeed) * 1.5;

        ctx.fillRect(p.x, p.y, length, Math.max(0.5, p.size / 2));
    });
    ctx.restore();
}

// 初始化UI
function initUI() {
    uiName.innerText = THEMES[state.currentThemeIdx].name;
    uiName.style.opacity = 0.9;
}

// 启动循环
initUI();
lastTimestamp = performance.now();
animationFrameId = requestAnimationFrame(gameLoop);
