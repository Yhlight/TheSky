/**
 * ASCENSION ENGINE 3.0: CINEMATIC FLOW
 * 核心升级点：Smoothstep过渡，速度动态控制，Lighter模式拖尾
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const uiName = document.getElementById('scene-name');

let w, h;

// --- 场景定义 (THEMES) ---
// 颜色格式为 HEX
const THEMES = [
    {
        name: "SPRING AWAKENING",
        sky: ['#42a5f5', '#e91e63'], // 蓝到粉
        sun: '#ffcdd2', sunSize: 60,
        mountFar: '#90caf9', mountNear: '#c8e6c9',
        ground: '#43a047',
        accent: '#ffffff', // 粒子/光芒色
        fogColor: '#f8bbd0', // 粉雾
        propType: 'petals'
    },
    {
        name: "GOLDEN RADIANCE",
        sky: ['#ff9800', '#ffeb3b'], // 橙到黄
        sun: '#ffcc80', sunSize: 100,
        mountFar: '#ffb74d', mountNear: '#795548',
        ground: '#6d4c41',
        accent: '#ffe0b2',
        fogColor: '#ffecb3', // 黄雾
        propType: 'ruins'
    },
    {
        name: "STARLIGHT VOID",
        sky: ['#1a237e', '#4527a0'], // 深蓝到紫
        sun: '#bbdefb', sunSize: 40, // 月亮
        mountFar: '#3f51b5', mountNear: '#673ab7',
        ground: '#303f9f',
        accent: '#b3e5fc',
        fogColor: '#9fa8da', // 蓝紫雾
        propType: 'crystals'
    },
    {
        name: "SCORCHING SANDS",
        sky: ['#FFD180', '#FFAB40'], // Light orange to deep orange
        sun: '#FFFF8D', sunSize: 120,
        mountFar: '#E2B290', mountNear: '#C18849',
        ground: '#D4A76A',
        accent: '#FFF9C4', // Pale yellow
        fogColor: '#FFE0B2',
        propType: 'desert'
    }
];

// --- 配置 ---
const CFG = {
    baseSpeed: 4,     // 默认速度
    boostSpeed: 18,   // 加速后速度
    accelerationSpeed: 36, // 加速后速度
    gravity: 0.2,     // 玩家下落速度
    transitionFrames: 350, // 场景切换所需帧数
    terrainBaseY: 0.9  // 地面在画面中的位置 (0-1)
};

// --- 状态管理 ---
const state = {
    t: 0, // 全局时间
    speed: CFG.baseSpeed,
    targetSpeed: CFG.baseSpeed,
    boostKeyDownTime: 0,

    currentThemeIdx: 0,
    nextThemeIdx: 1,
    transitionTimer: 0,

    player: {
        x: 0, y: 0, vy: 0, trail: []
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

// --- 初始化 ---
function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    state.player.x = w * 0.2;
    state.player.y = h * 0.5;
}
window.addEventListener('resize', resize);
resize();

// --- 核心交互与循环 ---

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'KeyD') {
        if (state.boostKeyDownTime === 0) {
            state.boostKeyDownTime = Date.now();
        }
        state.targetSpeed = CFG.boostSpeed;
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'KeyD') {
        state.boostKeyDownTime = 0;
        state.targetSpeed = CFG.baseSpeed;
    }
});
window.addEventListener('mousedown', () => state.targetSpeed = CFG.boostSpeed);
window.addEventListener('mouseup', () => state.targetSpeed = CFG.baseSpeed);
window.addEventListener('touchstart', (e) => { e.preventDefault(); state.targetSpeed = CFG.boostSpeed; }, { passive: false });
window.addEventListener('touchend', (e) => { e.preventDefault(); state.targetSpeed = CFG.baseSpeed; });


function update() {
    state.t++;

    // 1. 速度平滑控制
    if (state.boostKeyDownTime > 0 && Date.now() - state.boostKeyDownTime > 3000) {
        state.targetSpeed = CFG.accelerationSpeed;
    }
    state.speed = lerp(state.speed, state.targetSpeed, 0.05);

    // 2. 玩家垂直运动 (飞行控制) - 已修复
    const targetY = h * 0.5; // 目标Y轴始终是屏幕中点
    const springiness = 0.01; // 固定的弹性系数
    state.player.vy += (targetY - state.player.y) * springiness; // 弹性跟随
    state.player.vy *= 0.9; // 阻力
    state.player.y += state.player.vy;

    // 玩家拖尾
    state.player.trail.push({ x: state.player.x, y: state.player.y, speed: state.speed });
    const maxTrailLength = 10 + Math.floor(state.speed * 1.5); // 拖尾长度随速度变化
    if (state.player.trail.length > maxTrailLength) state.player.trail.shift();

    // 3. 场景导演与过渡
    state.transitionTimer++;
    // BUGFIX: 加速场景切换
    if (state.transitionTimer > CFG.transitionFrames) {
        state.transitionTimer = 0;
        state.currentThemeIdx = state.nextThemeIdx;
        state.nextThemeIdx = (state.currentThemeIdx + 1) % THEMES.length;

        uiName.style.opacity = 0;
        setTimeout(() => {
            uiName.innerText = THEMES[state.currentThemeIdx].name;
            uiName.style.opacity = 0.9;
        }, 500);
    }

    // 4. 世界生成
    generateWorldEntities();

    draw();
    requestAnimationFrame(update);
}

function generateWorldEntities() {
    // 根据速度调整生成密度
    const particleDensity = lerp(0.05, 0.5, (state.speed - CFG.baseSpeed) / (CFG.boostSpeed - CFG.baseSpeed));

    // Props (相对稀疏)
    if (Math.random() < 0.015) {
        const T = THEMES[state.currentThemeIdx];
        if (T.propType !== 'none') {
            state.props.push({
                x: w + 100,
                y: h * CFG.terrainBaseY - random(50, 150),
                type: T.propType,
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
            vx: -random(state.speed * 0.8, state.speed * 1.2),
            vy: random(-1, 1),
            life: 1,
            size: random(1, 3),
            type: THEMES[state.currentThemeIdx].propType
        });
    }

    // 更新实体位置和清理
    state.props = state.props.filter(o => { o.x -= state.speed; return o.x > -200; });
    state.particles = state.particles.filter(p => {
        // 粒子受速度影响，向后拉伸
        p.x += p.vx * lerp(1, 1.5, (state.speed / CFG.boostSpeed));
        p.y += p.vy;
        p.life -= 0.01 + state.speed * 0.001; // 速度越快，粒子消失越快
        return p.life > 0;
    });
}

function draw() {
    let P = state.transitionTimer / CFG.transitionFrames;
    // BUGFIX: 限制进度在 [0, 1] 之间
    P = Math.max(0, Math.min(P, 1));
    // 使用 Smoothstep 函数得到柔和的过渡进度
    const progress = (state.currentThemeIdx === state.nextThemeIdx) ? 0 : smoothstep(P);

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
        sunSize: lerp(T1.sunSize, T2.sunSize, progress)
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
    const sunY = lerp(h * 0.3, h * 0.5, progress);

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
    drawTerrain(ctx, C.mountFar, 0.2, 80, h * 0.6, state.t, state.speed);
    drawTerrain(ctx, C.mountNear, 0.4, 50, h * 0.75, state.t, state.speed);

    // --- 4. 远景粒子 (速度线) ---
    drawParticles(ctx, C, 0.5); // 远景粒子更透明，产生速度线效果

    // --- 5. 地面和前景 ---
    drawGroundAndProps(ctx, C);

    // --- 6. 玩家 (光之丝带) ---
    drawPlayer(ctx, C);

    // --- 7. 前景粒子 ---
    drawParticles(ctx, C, 1.0); // 前景粒子最清晰

    // --- 8. 体积雾/柔光层 ---
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = C.fogColor;
    ctx.globalAlpha = 0.1 + progress * 0.1; // 过渡时雾气变浓
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-over';
}

// 绘制地形
function drawTerrain(ctx, color, speedScale, amp, base, t, currentSpeed) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) {
        let scroll = t * currentSpeed * speedScale;
        // 引入了时间（t）和加速度（currentSpeed）
        let noise = Math.sin((x + scroll) * 0.002) * amp +
            Math.sin((x + scroll) * 0.01) * (amp * 0.3);
        ctx.lineTo(x, base - noise);
    }
    ctx.lineTo(w, h);
    ctx.fill();
}

// 绘制地面和装饰物
function drawGroundAndProps(ctx, C) {
    // 地面实体
    ctx.fillStyle = C.ground;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const groundBase = h * CFG.terrainBaseY;
    const scroll = state.t * state.speed;

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
        const x = p.x;
        // 贴合地面
        const groundY = groundBase + Math.sin((x + scroll) * 0.005) * 30;

        ctx.save();
        ctx.translate(x, groundY);
        ctx.scale(p.scale, p.scale);
        ctx.rotate(p.rot);

        ctx.shadowBlur = 10;
        ctx.shadowColor = C.accent;
        ctx.fillStyle = C.accent;

        if (p.type === 'petals') {
            ctx.fillStyle = C.accent;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(-5, -5, 10, 10);
        } else if (p.type === 'ruins') {
            ctx.fillStyle = C.mountNear;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(-15, -80, 30, 80);
        } else if (p.type === 'crystals') {
            ctx.fillStyle = 'white';
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(-10, -30); ctx.lineTo(0, -50); ctx.lineTo(10, -30);
            ctx.fill();
        } else if (p.type === 'desert') {
            // Saguaro Cactus Style
            ctx.fillStyle = C.mountNear;
            ctx.strokeStyle = C.ground;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;

            // Trunk
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.quadraticCurveTo(0, -40, 5, -80); // Slight curve
            ctx.lineTo(8, -80);
            ctx.quadraticCurveTo(2, -40, -2, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Left Arm
            ctx.beginPath();
            ctx.moveTo(-5, -50);
            ctx.quadraticCurveTo(-20, -60, -25, -40);
            ctx.quadraticCurveTo(-22, -65, -8, -52);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Right Arm
            ctx.beginPath();
            ctx.moveTo(8, -60);
            ctx.quadraticCurveTo(25, -70, 30, -50);
            ctx.quadraticCurveTo(28, -75, 11, -62);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
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

    // 强烈的辉光
    ctx.shadowBlur = 50;
    ctx.shadowColor = 'white';
    ctx.fillStyle = C.accent;
    ctx.rotate(state.t * 0.05);
    ctx.fillRect(-10, -10, 20, 20);

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
        const length = 1 + p.size * (state.speed / CFG.boostSpeed) * 5;

        ctx.fillRect(p.x, p.y, length, Math.max(0.5, p.size / 2));
    });
    ctx.restore();
}

// 启动循环
update();
