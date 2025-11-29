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
        sky: ['#42a5f5', '#e91e63'],
        sun: '#ffcdd2', sunSize: 60, sunY: 0.3, // Y位置 (0-1)
        mountFar: '#90caf9', mountNear: '#c8e6c9',
        ground: '#43a047',
        accent: '#ffffff',
        fogColor: '#f8bbd0', fogAlpha: 0.15, // 雾气透明度
        propType: 'petals'
    },
    {
        name: "GOLDEN RADIANCE",
        sky: ['#ff9800', '#ffeb3b'],
        sun: '#ffcc80', sunSize: 100, sunY: 0.4,
        mountFar: '#ffb74d', mountNear: '#795548',
        ground: '#6d4c41',
        accent: '#ffe0b2',
        fogColor: '#ffecb3', fogAlpha: 0.2,
        propType: 'ruins'
    },
    {
        name: "STARLIGHT VOID",
        sky: ['#1a237e', '#4527a0'],
        sun: '#bbdefb', sunSize: 40, sunY: 0.25,
        mountFar: '#3f51b5', mountNear: '#673ab7',
        ground: '#303f9f',
        accent: '#b3e5fc',
        fogColor: '#9fa8da', fogAlpha: 0.1,
        propType: 'crystals'
    },
    {
        name: "AUTUMN EMBRACE",
        sky: ['#ff8a65', '#ffb74d'],
        sun: '#fff3e0', sunSize: 70, sunY: 0.35,
        mountFar: '#d7ccc8', mountNear: '#a1887f',
        ground: '#8d6e63',
        accent: '#ffccbc',
        fogColor: '#ffcc80', fogAlpha: 0.18,
        propType: 'leaf'
    }
];

// --- 配置 ---
const CFG = {
    playerMinSpeed: 1.0,    // 基础巡航速度 (风力可能使其低于此值)
    playerMaxSpeed: 5,   // 加速时最大速度
    playerThrust: 0.06,    // 玩家加速时的推力
    dragCoefficient: 0.98, // 阻力系数 (越接近1，速度衰减越慢)
    windForceScale: 0.15,  // 風力強度（略微增强以实现速度波动）
    hoverForce: 0.01,   // 悬浮/回中力
    hoverDamping: 0.95, // 悬浮阻尼，防止过度振荡
    themeDuration: 12000, // 每个主题的持续时间 (毫秒)
    transitionDuration: 4000,  // 场景切换所需时间 (毫秒)
    terrainBaseY: 0.9,  // 地面在画面中的位置 (0-1)
    playerInitialX: 0.2 // 玩家初始 X 坐标 (0-1, 相对于屏幕宽度)
};

// --- 状态管理 ---
const state = {
    t: 0, // 全局时间, 用于噪声滚动
    isAccelerating: false, // 是否正在加速

    currentThemeIdx: 0,
    nextThemeIdx: 1,
    themeStartTime: 0, // 当前主题开始的时间戳
    transitionProgress: 0, // 0-1 的过渡进度

    player: {
        x: 0, y: 0,
        velocity: { x: CFG.playerMinSpeed, y: 0 },
        acceleration: { x: 0, y: 0 },
        trail: []
    },

    props: [],
    particles: []
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

// 优化的颜色插值，直接操作RGB数组
const lerpColorRgb = (rgb1, rgb2, t) => {
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

    // 计算增量时间 (delta time)，尽管当前未使用，但这是良好实践
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    update(timestamp); // 传递时间戳以驱动动画
    draw(timestamp);

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


function update(timestamp) {
    state.t++; // 仍然保留 t 用于一些基于帧的简单动画

    // --- 1. 新物理模型：施加力 ---
    const p = state.player;
    p.acceleration = { x: 0, y: 0 }; // 每帧重置加速度

    // a) 玩家推力
    if (state.isAccelerating) {
        p.acceleration.x += CFG.playerThrust;
    }

    // b) 风力 (持续变化)
    const windX = (windNoiseX.get(timestamp / 800) - 0.5) * 2; // -1 to 1
    const windY = (windNoiseY.get(timestamp / 600) - 0.5) * 2;  // -1 to 1
    p.acceleration.x += windX * CFG.windForceScale;
    p.acceleration.y += windY * CFG.windForceScale;

    // c) 悬浮/回中力 (使其保持在屏幕中央)
    const hoverTargetY = h / 2;
    const displacementY = hoverTargetY - p.y;
    p.acceleration.y += displacementY * CFG.hoverForce;

    // --- 2. 更新速度和位置 ---
    // a) 根据加速度更新速度
    p.velocity.x += p.acceleration.x;
    p.velocity.y += p.acceleration.y;

    // b) 应用阻力
    p.velocity.x *= CFG.dragCoefficient;
    p.velocity.y *= CFG.hoverDamping; // 垂直方向使用不同的阻尼

    // c) 限制最大/最小速度
    p.velocity.x = Math.min(p.velocity.x, CFG.playerMaxSpeed);

    // 确保速度不会过低，除非被风吹
    if (!state.isAccelerating && p.velocity.x < CFG.playerMinSpeed) {
        p.velocity.x = lerp(p.velocity.x, CFG.playerMinSpeed, 0.05);
    }

    // *** 关键修复：绝不后退 ***
    p.velocity.x = Math.max(0, p.velocity.x);

    // d) 根据速度更新位置
    // p.x 由下面的 lerp 平滑处理，以避免抖动
    p.y += p.velocity.y;

    // 修正玩家的横向位置，使其感觉在“前进”而不是“移动”
    const speedProgress = Math.max(0, p.velocity.x / CFG.playerMaxSpeed);
    let targetX = w * CFG.playerInitialX + lerp(0, w * 0.15, speedProgress);

    // 新逻辑：确保玩家在屏幕上的 X 位置永远不会减少
    // 只有当新的目标位置比当前位置更靠右时，我们才更新它
    if (targetX > p.x) {
        p.x = lerp(p.x, targetX, 0.02);
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
    const elapsedTime = timestamp - state.themeStartTime;
    const transitionStartTime = CFG.themeDuration - CFG.transitionDuration;

    // 检查是否应该开始UI淡出
    if (elapsedTime >= transitionStartTime && elapsedTime < transitionStartTime + 500) { // 在过渡开始时淡出
        uiName.style.opacity = 0;
    }

    // 计算并存储过渡进度
    if (elapsedTime >= transitionStartTime) {
        const rawProgress = (elapsedTime - transitionStartTime) / CFG.transitionDuration;
        state.transitionProgress = smoothstep(Math.max(0, Math.min(1, rawProgress)));
    } else {
        state.transitionProgress = 0;
    }

    // 当一个主题的完整持续时间结束后
    if (elapsedTime > CFG.themeDuration) {
        state.themeStartTime = timestamp; // 重置计时器
        state.currentThemeIdx = state.nextThemeIdx;
        state.nextThemeIdx = (state.currentThemeIdx + 1) % THEMES.length;

        // 更新文本并淡入
        uiName.innerText = THEMES[state.currentThemeIdx].name;
        uiName.style.opacity = 0.9;
    }

    // 4. 世界生成
    generateWorldEntities();
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
                x: w + 100,
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
    // 使用反向循环安全地在迭代时移除道具
    for (let i = state.props.length - 1; i >= 0; i--) {
        const p = state.props[i];
        p.x -= state.player.velocity.x;
        if (p.x <= -200) {
            state.props.splice(i, 1);
        }
    }

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
}

function draw(timestamp) {
    const progress = state.transitionProgress;

    const T1 = THEMES[state.currentThemeIdx];
    const T2 = THEMES[state.nextThemeIdx];

    // 混合颜色配置 (使用预计算的RGB值)
    const C = {
        skyTop: lerpColorRgb(T1.skyRgb[0], T2.skyRgb[0], progress),
        skyBot: lerpColorRgb(T1.skyRgb[1], T2.skyRgb[1], progress),
        sun: lerpColorRgb(T1.sunRgb, T2.sunRgb, progress),
        mountFar: lerpColorRgb(T1.mountFarRgb, T2.mountFarRgb, progress),
        mountNear: lerpColorRgb(T1.mountNearRgb, T2.mountNearRgb, progress),
        ground: lerpColorRgb(T1.groundRgb, T2.groundRgb, progress),
        accent: lerpColorRgb(T1.accentRgb, T2.accentRgb, progress),
        fogColor: lerpColorRgb(T1.fogColorRgb, T2.fogColorRgb, progress),
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

    // --- 3. 多层视差地形 ---
    drawTerrain(ctx, C.mountFar, 0.2, 120, h * 0.65, state.t, state.player.velocity.x, 0.002);
    drawTerrain(ctx, C.mountNear, 0.4, 100, h * 0.75, state.t, state.player.velocity.x, 0.004);

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
    drawGroundAndProps(ctx, C);

    // --- 6. 玩家 (光之丝带) ---
    drawPlayer(ctx, C);

    // --- 7. 前景粒子 ---
    drawParticles(ctx, C, 1.0); // 前景粒子最清晰

    ctx.globalCompositeOperation = 'source-over';
}

// 绘制地形 (*** 使用Value Noise重构 ***)
function drawTerrain(ctx, color, speedScale, amp, base, t, currentSpeed, freq) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) { // 增加采样密度
        let scroll = t * currentSpeed * speedScale * 0.01;

        // 叠加两层噪声以获得更丰富的细节
        let noiseVal = terrainNoise.get((x * freq) + scroll) * amp;
        noiseVal += terrainNoise.get((x * freq * 2.5) + scroll + 17) * (amp * 0.4);

        ctx.lineTo(x, base - noiseVal);
    }
    ctx.lineTo(w, h);
    ctx.fill();
}

// --- 道具绘制逻辑 (模块化) ---
const PROP_DRAWERS = {
    'petals': (ctx, C, p) => {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-5, -5, 10, 10);
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
    }
};

// 绘制地面和装饰物
function drawGroundAndProps(ctx, C) {
    // 地面实体
    ctx.fillStyle = C.ground;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const groundBase = h * CFG.terrainBaseY;
    const scroll = state.t * state.player.velocity.x;

    // 地面线条 (最快的 parallax 速度)
    for (let x = 0; x <= w; x += 20) {
        let y = groundBase + Math.sin((x + scroll) * 0.005) * 30;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.fill();

    // 地面高光
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 装饰物 (Props)
    state.props.forEach(p => {
        const drawer = PROP_DRAWERS[p.type];
        if (!drawer) return; // 如果没有对应的绘制函数，则跳过

        const x = p.x;
        // 贴合地面
        const groundY = groundBase + Math.sin((x + scroll) * 0.005) * 30;

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

// --- 主程序启动 ---

function initThemes() {
    // 预计算颜色值以优化性能
    THEMES.forEach(theme => {
        for (const key in theme) {
            if (typeof theme[key] === 'string' && theme[key].startsWith('#')) {
                theme[key + 'Rgb'] = hexToRgb(theme[key]);
            } else if (Array.isArray(theme[key]) && typeof theme[key][0] === 'string' && theme[key][0].startsWith('#')) {
                // 处理颜色数组 (例如 sky)
                theme[key + 'Rgb'] = theme[key].map(hexToRgb);
            }
        }
    });
}

// 启动循环
initThemes();
initUI();
lastTimestamp = performance.now();
state.themeStartTime = lastTimestamp; // 初始化主题计时器
animationFrameId = requestAnimationFrame(gameLoop);
