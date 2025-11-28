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
        name: "DESERT MIRAGE",
        sky: ['#ffc107', '#ff8f00'], // 黄到橙
        sun: '#ffca28', sunSize: 120,
        mountFar: '#ffb300', mountNear: '#e65100',
        ground: '#d4a777',
        accent: '#ffffff',
        fogColor: '#ffe0b2',
        propType: 'dunes'
    },
    {
        name: "ARCTIC SILENCE",
        sky: ['#e3f2fd', '#bbdefb'], // 淡蓝到浅蓝
        sun: '#ffffff', sunSize: 50,
        mountFar: '#90a4ae', mountNear: '#b0bec5',
        ground: '#f5f5f5',
        accent: '#e0f7fa',
        fogColor: '#eceff1',
        propType: 'snowflakes'
    },
    {
        name: "NEBULA ODYSSEY",
        sky: ['#000000', '#0c0e1a'], // 黑到深空蓝
        sun: '#ffffff', sunSize: 20, // Distant star
        mountFar: '#1a237e', mountNear: '#283593',
        ground: '#010410',
        accent: '#f0f4ff',
        fogColor: '#3949ab',
        propType: 'stars'
    },
    {
        name: "SPRING MEADOW",
        sky: ['#81c784', '#aed581'], // 绿到淡绿
        sun: '#fff59d', sunSize: 70,
        mountFar: '#a5d6a7', mountNear: '#c5e1a5',
        ground: '#7cb342',
        accent: '#fce4ec',
        fogColor: '#dcedc8',
        propType: 'flowers',
        particleType: 'petals'
    },
    {
        name: "AUTUMN BREEZE",
        sky: ['#ff8a65', '#ffb74d'], // 橙到黄
        sun: '#fff176', sunSize: 60,
        mountFar: '#d7ccc8', mountNear: '#a1887f',
        ground: '#8d6e63',
        accent: '#ffcc80',
        fogColor: '#efebe9',
        propType: 'fallingLeaves',
        particleType: 'leaves'
    },
    {
        name: "OCEANIC GRANDEUR",
        sky: ['#2196f3', '#64b5f6'], // 蓝到浅蓝
        sun: '#fafafa', sunSize: 80,
        mountFar: '#90caf9', mountNear: '#bbdefb',
        ground: '#1976d2',
        accent: '#ffffff',
        fogColor: '#e3f2fd',
        propType: 'waves'
    },
    {
        name: "GENTLE RAIN",
        sky: ['#607d8b', '#90a4ae'], // 灰蓝
        sun: '#b0bec5', sunSize: 40, // Hidden sun
        mountFar: '#78909c', mountNear: '#546e7a',
        ground: '#455a64',
        accent: '#cfd8dc',
        fogColor: '#b0bec5',
        propType: 'puddles',
        particleType: 'rain'
    }
];

// --- 配置 ---
const CFG = {
    baseSpeed: 4,     // 默认速度
    boostSpeed: 18,   // 加速后速度
    gravity: 0.2,     // 玩家下落速度
    transitionFrames: 350, // 场景切换所需帧数
    terrainBaseY: 0.9  // 地面在画面中的位置 (0-1)
};

// --- 状态管理 ---
const state = {
    t: 0, // 全局时间
    lastTime: 0,
    dt: 0,
    speed: CFG.baseSpeed,
    targetSpeed: CFG.baseSpeed,

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

const keyPressTimers = {};
let isSpeedLocked = false;

window.addEventListener('keydown', (e) => {
    const keyCode = e.code;
    if (keyCode !== 'KeyD' && keyCode !== 'Space') return;

    // If speed is locked, a new key press will unlock it.
    if (isSpeedLocked) {
        isSpeedLocked = false;
        state.targetSpeed = CFG.baseSpeed;
        // Clean up any lingering timers just in case.
        Object.values(keyPressTimers).forEach(clearTimeout);
        for (const key in keyPressTimers) {
            delete keyPressTimers[key];
        }
        return;
    }

    // If this key is already being held down, do nothing.
    if (keyPressTimers[keyCode]) return;

    state.targetSpeed = CFG.boostSpeed;

    keyPressTimers[keyCode] = setTimeout(() => {
        isSpeedLocked = true;
        // Once locked, we can clear the timer.
        delete keyPressTimers[keyCode];
    }, 3000);
});

window.addEventListener('keyup', (e) => {
    const keyCode = e.code;
    if (keyCode !== 'KeyD' && keyCode !== 'Space') return;

    // If speed is locked, keyup does nothing. A new keydown is required to unlock.
    if (isSpeedLocked) return;

    if (keyPressTimers[keyCode]) {
        clearTimeout(keyPressTimers[keyCode]);
        delete keyPressTimers[keyCode];
    }

    // Only return to base speed if no other acceleration keys are held down.
    if (Object.keys(keyPressTimers).length === 0) {
        state.targetSpeed = CFG.baseSpeed;
    }
});


function update(currentTime) {
    if (state.lastTime > 0) {
        state.dt = (currentTime - state.lastTime) / (1000 / 60); // 标准化为60FPS
    }
    state.lastTime = currentTime;

    // 如果dt太大（例如，标签页在后台），则跳过这一帧
    if (state.dt > 4) {
        requestAnimationFrame(update);
        return;
    }

    state.t += state.dt;

    // 1. 速度平滑控制
    state.speed = lerp(state.speed, state.targetSpeed, 0.05 * state.dt);

    // 2. 玩家垂直运动 (飞行控制)
    // BUG 修复：解除 Y 轴位置与速度的关联，实现纯粹的水平加速
    const targetY = h * 0.5;
    const springiness = 0.005 * state.speed * state.dt;

    state.player.vy += (targetY - state.player.y) * springiness; // 弹性跟随
    state.player.vy *= Math.pow(0.85, state.dt); // 阻力
    state.player.y += state.player.vy * state.dt;

    // 玩家拖尾
    state.player.trail.push({ x: state.player.x, y: state.player.y, speed: state.speed });
    const maxTrailLength = 10 + Math.floor(state.speed * 1.5); // 拖尾长度随速度变化
    if (state.player.trail.length > maxTrailLength) state.player.trail.shift();

    // 3. 场景导演与过渡
    state.transitionTimer += state.dt;
    if (state.transitionTimer > CFG.transitionFrames * 4) {
        state.transitionTimer = 0;
        state.currentThemeIdx = state.nextThemeIdx;
        state.nextThemeIdx = (state.currentThemeIdx + 1) % THEMES.length;
        uiName.style.opacity = 0;
        setTimeout(() => {
            uiName.innerText = THEMES[state.nextThemeIdx].name;
            uiName.style.opacity = 0.9;
        }, 1000);
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
            const newProp = {
                x: w + 100,
                y: h * CFG.terrainBaseY - random(50, 150),
                type: T.propType,
                scale: random(0.8, 1.5),
                rot: random(0, Math.PI * 2)
            };
            if (newProp.type === 'stars') {
                newProp.alpha = random(0.2, 1.0);
            }
            state.props.push(newProp);
        }
    }

    // Particles (密集且受速度影响)
    if (Math.random() < particleDensity) {
        const T = THEMES[state.currentThemeIdx];
        const newParticle = {
            x: w + 10,
            y: random(0, h),
            vx: -random(state.speed * 0.8, state.speed * 1.2),
            vy: random(-1, 1),
            life: 1,
            size: random(1, 3),
            type: T.particleType || 'default',
            rot: random(0, Math.PI * 2)
        };

        if (newParticle.type === 'rain') {
            newParticle.vx = -state.speed - 10;
            newParticle.vy = 20;
        }

        state.particles.push(newParticle);
    }

    // 更新实体位置和清理
    state.props = state.props.filter(o => { o.x -= state.speed * state.dt; return o.x > -200; });
    state.particles = state.particles.filter(p => {
        // 粒子受速度影响，向后拉伸
        p.x += p.vx * lerp(1, 1.5, (state.speed / CFG.boostSpeed)) * state.dt;
        p.y += p.vy * state.dt;
        p.life -= (0.01 + state.speed * 0.001) * state.dt; // 速度越快，粒子消失越快
        return p.life > 0;
    });
}

function draw() {
    const P = state.transitionTimer / CFG.transitionFrames;
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

const PROP_DRAWERS = {
    petals: (ctx, C) => {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-5, -5, 10, 10);
    },
    ruins: (ctx, C) => {
        ctx.fillStyle = C.mountNear;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-15, -80, 30, 80);
    },
    crystals: (ctx, C) => {
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-10, -30); ctx.lineTo(0, -50); ctx.lineTo(10, -30);
        ctx.fill();
    },
    dunes: (ctx, C) => {
        ctx.fillStyle = C.ground;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.quadraticCurveTo(0, -30, 20, 0);
        ctx.fill();
    },
    snowflakes: (ctx, p) => {
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.8;
        ctx.font = `${p.scale * 30}px Arial`;
        ctx.fillText('❄', -10, 0);
    },
    stars: (ctx, p) => {
        ctx.fillStyle = 'white';
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(0, 0, p.scale * 2, 0, Math.PI * 2);
        ctx.fill();
    },
    flowers: (ctx, C) => {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const x = Math.cos(angle) * 8;
            const y = Math.sin(angle) * 8;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#ffeb3b'; // Flower center
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
    },
    fallingLeaves: (ctx, C) => {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(10, 10, 0, 20);
        ctx.quadraticCurveTo(-10, 10, 0, 0);
        ctx.fill();
    },
    puddles: (ctx, C) => {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    }
};

const PARTICLE_DRAWERS = {
    default: (ctx, p) => {
        const length = 1 + p.size * (state.speed / CFG.boostSpeed) * 5;
        ctx.fillRect(p.x, p.y, length, Math.max(0.5, p.size / 2));
    },
    petals: (ctx, p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size * 2, -p.size, p.size * 4, p.size * 2);
        ctx.restore();
    },
    leaves: (ctx, p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(p.size * 2, p.size * 2, 0, p.size * 4);
        ctx.quadraticCurveTo(-p.size * 2, p.size * 2, 0, 0);
        ctx.fill();
        ctx.restore();
    },
    rain: (ctx, p) => {
        ctx.fillRect(p.x, p.y, 2, 15);
    }
};

// 绘制地面和装饰物
function drawGroundAndProps(ctx, C) {
    const groundBase = h * CFG.terrainBaseY;
    const scroll = state.t * state.speed;
    const currentTheme = THEMES[state.currentThemeIdx];

    if (currentTheme.propType === 'waves') {
        // Draw waves instead of ground
        const waveColors = ['rgba(25, 118, 210, 0.5)', 'rgba(100, 181, 246, 0.5)', 'rgba(255, 255, 255, 0.5)'];
        for (let i = 0; i < waveColors.length; i++) {
            ctx.fillStyle = waveColors[i];
            ctx.beginPath();
            ctx.moveTo(0, h);
            const waveOffset = i * 0.5;
            for (let x = 0; x <= w; x += 20) {
                let y = groundBase + Math.sin((x + scroll * (1 + waveOffset)) * 0.003) * 20 + i * 15;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.fill();
        }
    } else {
        // Draw standard ground
        ctx.fillStyle = C.ground;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 20) {
            let y = groundBase + Math.sin((x + scroll) * 0.005) * 30;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.fill();

        // Ground highlight
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw props (but not for waves, as they replace the ground props)
    if (currentTheme.propType !== 'waves') {
        state.props.forEach(p => {
            const x = p.x;
            const groundY = groundBase + Math.sin((x + scroll) * 0.005) * 30;

            ctx.save();
            ctx.translate(x, groundY);
            ctx.scale(p.scale, p.scale);
            ctx.rotate(p.rot);

            ctx.shadowBlur = 10;
            ctx.shadowColor = C.accent;
            ctx.fillStyle = C.accent;

            const drawFunc = PROP_DRAWERS[p.type];
            if (drawFunc) {
                drawFunc(ctx, p.type === 'snowflakes' || p.type === 'stars' ? p : C);
            }

            ctx.restore();
        });
    }
}

// 绘制玩家 (光之子)
function drawPlayer(ctx, C) {
    const p = state.player;

    // 1. 拖尾 (粒子化)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    p.trail.forEach((point, i) => {
        const progress = i / p.trail.length; // 0 (tail) to 1 (head)

        // 拖尾末端的粒子更小
        const size = 2 + progress * 5;

        // 拖尾末端的粒子更透明
        const alpha = progress * 0.7;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();

    // 2. 角色本体 (核心发光体)
    ctx.save();
    ctx.translate(p.x, p.y);

    // 强烈的辉光
    ctx.shadowBlur = 50;
    ctx.shadowColor = 'white';
    ctx.fillStyle = C.accent;

    // 旋转并绘制一个更像晶体的形状
    ctx.rotate(state.t * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
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

        p.rot += state.speed * 0.005 * state.dt;

        const drawFunc = PARTICLE_DRAWERS[p.type] || PARTICLE_DRAWERS.default;
        drawFunc(ctx, p);
    });
    ctx.restore();
}

// 启动循环
requestAnimationFrame(update);
