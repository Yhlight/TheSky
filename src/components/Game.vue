<template>
  <div>
    <div id="fx-layer"></div>
    <div id="ui">
      <h1 ref="uiNameRef" :class="{ visible: isSceneNameVisible }">{{ sceneNameText }}</h1>
      <div class="guide">HOLD [D] or [SPACE] TO ACCELERATE</div>
    </div>
    <audio ref="bgMusicRef" src="https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monplaisir/And_Then_We_Will_Be_Okay/Monplaisir_-_01_-_And_Then_We_Will_Be_Okay.mp3" loop></audio>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';

// Vue template refs
const canvasRef = ref(null);
const uiNameRef = ref(null);
const bgMusicRef = ref(null);

// Reactive state for UI
const sceneNameText = ref('');
const isSceneNameVisible = ref(false);

// Game variables
let ctx = null;
let isMusicStarted = false;
let UILang = 'ch'; // 'en' or 'ch'
let w, h;
let animationFrameId = null; // for pause/resume
let lastTimestamp = 0;
let isPaused = false;

// --- Scene Definitions (THEMES) ---
const THEMES = [
    {
        name: { en: "SPRING AWAKENING", ch: "春日初醒" },
        tags: ['bright', 'nature', 'mountain', 'spring'],
        sky: ['#64b5f6', '#e91e63'],
        sun: '#fff9c4', sunSize: 70, sunY: 0.3,
        mountFar: '#a5d6a7', mountNear: '#81c784',
        ground: '#66bb6a',
        accent: '#ffffff',
        fogColor: '#f8bbd0', fogAlpha: 0.1,
        propType: 'grass',
        terrainStyle: 'mountain',
        weather: 'rain'
    },
    {
        name: { en: "GOLDEN RADIANCE", ch: "金色光辉" },
        tags: ['bright', 'ruins', 'mountain', 'dry'],
        sky: ['#ffb74d', '#ff9800'],
        sun: '#fffde7', sunSize: 120, sunY: 0.4,
        mountFar: '#bcaaa4', mountNear: '#8d6e63',
        ground: '#795548',
        accent: '#fff3e0',
        fogColor: '#ffecb3', fogAlpha: 0.15,
        propType: 'ruins',
        terrainStyle: 'mountain',
        weather: 'windy'
    },
    {
        name: { en: "STARLIGHT VOID", ch: "星光虚空" },
        tags: ['dark', 'space', 'crystals', 'void'],
        sky: ['#00003f', '#2c2c54'],
        sun: '#ffffff', sunSize: 30, sunY: 0.25,
        mountFar: '#303f9f', mountNear: '#3f51b5',
        ground: '#1a237e',
        accent: '#e3f2fd',
        fogColor: '#5c6bc0', fogAlpha: 0.1,
        propType: 'crystals',
        terrainStyle: 'jagged',
        weather: 'none'
    },
    {
        name: { en: "AUTUMN EMBRACE", ch: "秋日之拥" },
        tags: ['warm', 'nature', 'mountain', 'windy'],
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
        name: { en: "AZURE DREAM", ch: "蔚蓝之梦" },
        tags: ['bright', 'ocean', 'calm'],
        sky: ['#4dd0e1', '#0097a7'],
        sun: '#e0f7fa', sunSize: 80, sunY: 0.2,
        mountFar: '#b2ebf2', mountNear: '#80deea',
        ground: '#006064',
        accent: '#ffffff',
        fogColor: '#80deea', fogAlpha: 0.2,
        propType: 'bubbles',
        terrainStyle: 'ocean',
        weather: 'none'
    },
    {
        name: { en: "NEON GRID", ch: "霓虹网格" },
        tags: ['dark', 'city', 'cyberpunk', 'stormy'],
        sky: ['#000000', '#5e35b1'],
        sun: '#f06292', sunSize: 90, sunY: 0.5,
        mountFar: '#283593', mountNear: '#1a237e',
        ground: '#12005e',
        accent: '#ff4081',
        fogColor: '#3949ab', fogAlpha: 0.15,
        propType: 'skyscrapers',
        terrainStyle: 'cityscape',
        weather: 'rain'
    },
    {
        name: { en: "FROZEN WASTELAND", ch: "冰封废土" },
        tags: ['cold', 'ice', 'jagged', 'desolate'],
        sky: ['#b0bec5', '#78909c'],
        sun: '#f5f5f5', sunSize: 50, sunY: 0.2,
        mountFar: '#cfd8dc', mountNear: '#b0bec5',
        ground: '#eceff1',
        accent: '#ffffff',
        fogColor: '#cfd8dc', fogAlpha: 0.35,
        propType: 'none',
        terrainStyle: 'jagged',
        weather: 'snow'
    },
    {
        name: { en: "VOLCANIC CHASM", ch: "火山裂谷" },
        tags: ['dark', 'fire', 'jagged', 'hostile', 'stormy'],
        sky: ['#210806', '#8c1102'],
        sun: '#ffae3d', sunSize: 150, sunY: 0.6,
        mountFar: '#1a090d', mountNear: '#2b0f15',
        ground: '#3d141d',
        accent: '#ff4d00',
        fogColor: '#592d1b', fogAlpha: 0.25,
        propType: 'volcano',
        terrainStyle: 'jagged',
        weather: 'embers'
    },
    {
        name: { en: "BIOLUMINESCENT WOODS", ch: "荧光森林" },
        tags: ['dark', 'nature', 'forest', 'magic'],
        sky: ['#010a1c', '#10032e'],
        sun: '#a9d5ff', sunSize: 40, sunY: 0.15,
        mountFar: '#0b122e', mountNear: '#111942',
        ground: '#192359',
        accent: '#00fff0',
        fogColor: '#2a3d8f', fogAlpha: 0.15,
        propType: 'mushrooms',
        terrainStyle: 'mountain',
        weather: 'spores'
    },
    {
        name: { en: "CITY IN THE CLOUDS", ch: "云端之城" },
        tags: ['bright', 'sky', 'city', 'heavenly'],
        sky: ['#a1c4fd', '#c2e9fb'],
        sun: '#ffd700', sunSize: 100, sunY: 0.3,
        mountFar: '#e0f2f1', mountNear: '#ffffff',
        ground: '#f0f8ff',
        accent: '#ffc107',
        fogColor: '#ffffff', fogAlpha: 0.2,
        propType: 'floating_islands',
        terrainStyle: 'ocean',
        weather: 'none'
    },
    {
        name: { en: "GIANT TREE FOREST", ch: "巨木之森" },
        tags: ['nature', 'forest', 'calm', 'giant'],
        sky: ['#1a3a3a', '#005a5a'],
        sun: '#f0fff0', sunSize: 60, sunY: 0.1,
        mountFar: '#002a2a', mountNear: '#0f3a3a',
        ground: '#1d4a4a',
        accent: '#88ff88',
        fogColor: '#3a7a7a', fogAlpha: 0.2,
        propType: 'branches',
        terrainStyle: 'mountain',
        weather: 'petals'
    },
    {
        name: { en: "CRYSTAL CAVES", ch: "水晶洞窟" },
        tags: ['dark', 'cave', 'crystals', 'magic'],
        sky: ['#1e1a3d', '#3e2a6d'],
        sun: '#ffffff', sunSize: 10, sunY: 0.5,
        mountFar: '#2e2a5d', mountNear: '#4e3a8d',
        ground: '#5e4a9d',
        accent: '#ffacff',
        fogColor: '#6e5a9d', fogAlpha: 0.15,
        propType: 'crystal_clusters',
        terrainStyle: 'jagged',
        weather: 'energy_motes'
    },
    {
        name: { en: "AURORA GLACIER", ch: "极光冰川" },
        tags: ['cold', 'ice', 'sky', 'winter', 'aurora'],
        sky: ['#0c1440', '#00a896'],
        sun: '#ffffff', sunSize: 40, sunY: 0.2,
        mountFar: '#add8e6', mountNear: '#ffffff',
        ground: '#d4f1f9',
        accent: '#98fb98',
        fogColor: '#a0d8ef', fogAlpha: 0.3,
        propType: 'icebergs',
        terrainStyle: 'jagged',
        weather: 'snow'
    },
    {
        name: { en: "CORAL KINGDOM", ch: "珊瑚王国" },
        tags: ['ocean', 'nature', 'calm', 'colorful'],
        sky: ['#003973', '#005f9e'],
        sun: '#ffffff', sunSize: 100, sunY: 0.1,
        mountFar: '#004983', mountNear: '#006fae',
        ground: '#008fce',
        accent: '#ff6f61',
        fogColor: '#007fbe', fogAlpha: 0.25,
        propType: 'corals',
        terrainStyle: 'ocean',
        weather: 'bubbles'
    },
    {
        name: { en: "HANGING GARDENS", ch: "空中花园" },
        tags: ['bright', 'ruins', 'nature', 'heavenly'],
        sky: ['#fdebd0', '#f5b041'],
        sun: '#fff5e1', sunSize: 120, sunY: 0.2,
        mountFar: '#d5dbdb', mountNear: '#abb2b9',
        ground: '#a3e4d7',
        accent: '#3498db',
        fogColor: '#fef9e7', fogAlpha: 0.1,
        propType: 'ancient_pillars',
        terrainStyle: 'mountain',
        weather: 'waterfall_spray'
    },
    {
        name: { en: "DESERT COLOSSUS", ch: "沙漠巨像" },
        tags: ['dry', 'ruins', 'giant', 'desolate'],
        sky: ['#f5cba7', '#d35400'],
        sun: '#ffffff', sunSize: 90, sunY: 0.4,
        mountFar: '#e59866', mountNear: '#af601a',
        ground: '#d39b5b',
        accent: '#fdebd0',
        fogColor: '#f5cba7', fogAlpha: 0.2,
        propType: 'colossus_parts',
        terrainStyle: 'mountain',
        weather: 'sandstorm'
    },
    {
        name: { en: "STEAMPUNK METROPOLIS", ch: "蒸汽都市" },
        tags: ['dark', 'city', 'industrial', 'steampunk'],
        sky: ['#4a4a4a', '#2c3e50'],
        sun: '#ffc107', sunSize: 70, sunY: 0.3,
        mountFar: '#566573', mountNear: '#2c3e50',
        ground: '#839192',
        accent: '#e67e22',
        fogColor: '#99a3a4', fogAlpha: 0.3,
        propType: 'gears_and_pipes',
        terrainStyle: 'cityscape',
        weather: 'steam'
    },
    {
        name: { en: "SILENT LIBRARY", ch: "沉寂书库" },
        tags: ['dark', 'ruins', 'magic', 'indoor'],
        sky: ['#2c2c54', '#1a1a3a'],
        sun: '#fffacd', sunSize: 50, sunY: 0.1,
        mountFar: '#3c3c64', mountNear: '#4c4c7a',
        ground: '#5c5c8a',
        accent: '#ffd700',
        fogColor: '#4c4c7a', fogAlpha: 0.25,
        propType: 'flying_books',
        terrainStyle: 'cityscape',
        weather: 'glowing_dust'
    },
    {
        name: { en: "WORLD OF REFLECTIONS", ch: "倒影之境" },
        tags: ['bright', 'abstract', 'calm', 'surreal'],
        sky: ['#eaf2f8', '#aed6f1'],
        sun: '#ffffff', sunSize: 200, sunY: 0.5,
        mountFar: '#d6eaf8', mountNear: '#aed6f1',
        ground: '#85c1e9',
        accent: '#ffffff',
        fogColor: '#eaf2f8', fogAlpha: 0.1,
        propType: 'reflection_shards',
        terrainStyle: 'ocean',
        weather: 'none'
    },
    {
        name: { en: "PLAYGROUND OF GIANTS", ch: "巨人之憩" },
        tags: ['bright', 'giant', 'surreal', 'playful'],
        sky: ['#fcf3cf', '#f7dc6f'],
        sun: '#fdfefe', sunSize: 150, sunY: 0.3,
        mountFar: '#fad7a0', mountNear: '#f5b041',
        ground: '#f8c471',
        accent: '#e74c3c',
        fogColor: '#fcf3cf', fogAlpha: 0.2,
        propType: 'giant_toys',
        terrainStyle: 'mountain',
        weather: 'none'
    },
    {
        name: { en: "CORRIDOR OF MEMORIES", ch: "记忆回廊" },
        tags: ['monochrome', 'abstract', 'surreal', 'memory'],
        sky: ['#d5d8dc', '#566573'],
        sun: '#ffffff', sunSize: 80, sunY: 0.2,
        mountFar: '#abb2b9', mountNear: '#808b96',
        ground: '#566573',
        accent: '#ffffff',
        fogColor: '#d5d8dc', fogAlpha: 0.3,
        propType: 'memory_fragments',
        terrainStyle: 'jagged',
        weather: 'none'
    },
    {
        name: { en: "STRING THEORY SEA", ch: "无垠弦论" },
        tags: ['dark', 'void', 'abstract', 'sci-fi'],
        sky: ['#000000', '#1c0a1c'],
        sun: '#ffffff', sunSize: 5, sunY: 0.5,
        mountFar: '#1c0a1c', mountNear: '#2c1a2c',
        ground: '#3c2a3c',
        accent: '#ff00ff',
        fogColor: '#2c1a2c', fogAlpha: 0.1,
        propType: 'energy_strings',
        terrainStyle: 'ocean',
        weather: 'none'
    },
    {
        name: { en: "SHATTERED REALITY", ch: "碎裂现实" },
        tags: ['abstract', 'glitch', 'surreal', 'hostile'],
        sky: ['#ffffff', '#ffffff'],
        sun: '#000000', sunSize: 50, sunY: 0.5,
        mountFar: '#cccccc', mountNear: '#999999',
        ground: '#666666',
        accent: '#ff0000',
        fogColor: '#ffffff', fogAlpha: 0.0,
        propType: 'glitches',
        terrainStyle: 'jagged',
        weather: 'none'
    }
];

// --- Config ---
const CFG = {
    playerMinSpeed: 4,
    playerMaxSpeed: 35,
    playerThrust: 0.3,
    dragCoefficient: 0.99,
    windForceScale: 0.1,
    hoverForce: 0.01,
    hoverDamping: 0.95,
    transitionFrames: 350,
    terrainBaseY: 0.9,
    playerInitialX: 0.2,
    CHUNK_WIDTH: 1000,
    CHUNK_RESOLUTION: 20,
    TERRAIN_LAYERS: 3,
    PRE_GENERATION_RANGE: 2,
};

// --- State Management ---
const state = reactive({
    t: 0,
    worldScrollX: 0,
    isAccelerating: false,
    currentTheme: null,
    nextTheme: null,
    transitionTimer: 0,
    transitionProgress: 0,
    isFadingOut: false,
    player: {
        x: 0, y: 0,
        velocity: { x: CFG.playerMinSpeed, y: 0 },
        acceleration: { x: 0, y: 0 },
        trail: []
    },
    props: [],
    particles: [],
    terrain: {
        chunks: new Map(),
        lastGeneratedChunkId: -1
    },
    weatherParticles: [],
    npcs: [],
    distantEntities: [],
    lightning: {
        timer: 200,
        alpha: 0
    },
    aurora: {
        bands: []
    }
});

// --- Helper Functions ---
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
const hexToRgb = (hex) => {
    let bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};
const lerpColor = (c1, c2, t) => {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    const r = Math.round(lerp(rgb1[0], rgb2[0], t));
    const g = Math.round(lerp(rgb1[1], rgb2[1], t));
    const b = Math.round(lerp(rgb1[2], rgb2[2], t));
    return `rgb(${r},${g},${b})`;
};
const random = (min, max) => Math.random() * (max - min) + min;

// --- Value Noise ---
class ValueNoise {
    constructor(seed = Math.random()) {
        this.seed = seed;
        this.values = new Array(256).fill(0).map(() => Math.random());
    }
    cosineInterpolate(a, b, t) {
        const ft = t * Math.PI;
        const f = (1 - Math.cos(ft)) * 0.5;
        return a * (1 - f) + b * f;
    }
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
const auroraNoise = new ValueNoise(Math.random());

// --- Director Module ---
const Director = {
    baseThemes: [...THEMES],
    nameParts: {
        adjectives: {
            reds: [{ en: "Crimson", ch: "猩红" }, { en: "Ruby", ch: "宝石" }, { en: "Scarlet", ch: "绯红" }],
            oranges: [{ en: "Golden", ch: "金色" }, { en: "Amber", ch: "琥珀" }, { en: "Bronze", ch: "青铜" }],
            yellows: [{ en: "Sun-Kissed", ch: "曜日" }, { en: "Gilded", ch: "镀金" }, { en: "Topaz", ch: "黄玉" }],
            greens: [{ en: "Verdant", ch: "翠绿" }, { en: "Emerald", ch: "翡翠" }, { en: "Mossy", ch: "苍苔" }],
            cyans: [{ en: "Azure", ch: "蔚蓝" }, { en: "Cyan", ch: "青色" }, { en: "Turquoise", ch: "绿松石" }],
            blues: [{ en: "Cobalt", ch: "钴蓝" }, { en: "Sapphire", ch: "宝蓝" }, { en: "Midnight", ch: "午夜" }],
            purples: [{ en: "Violet", ch: "紫罗兰" }, { en: "Amethyst", ch: "紫晶" }, { en: "Indigo", ch: "靛青" }],
            pinks: [{ en: "Rose", ch: "蔷薇" }, { en: "Fuchsia", ch: "洋红" }, { en: "Coral", ch: "珊瑚" }],
            neutrals: [{ en: "Starlight", ch: "星光" }, { en: "Whispering", ch: "低语" }, { en: "Forgotten", ch: "遗忘" }, { en: "Sunken", ch: "沉没" }, { en: "Crystal", ch: "水晶" }, { en: "Obsidian", ch: "黑曜石" }]
        },
        nouns: [
            { en: "Expanse", ch: "苍穹" }, { en: "Chasm", ch: "峡谷" },
            { en: "Citadel", ch: "堡垒" }, { en: "Sanctuary", ch: "圣殿" },
            { en: "Wastes", ch: "废土" }, { en: "Garden", ch: "花园" },
            { en: "Void", ch: "虚空" }, { en: "Kingdom", ch: "王国" },
            { en: "Glacier", ch: "冰川" }, { en: "Sea", ch: "之海" }
        ]
    },
    init: function() {
        console.log("Director initialized.");
    },
    _getHue: function(hex) {
        const rgb = hexToRgb(hex);
        const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h;
        if (max === min) { h = 0; }
        else {
            const d = max - min;
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return h * 360;
    },
    generateName: function(palette) {
        const hue = this._getHue(palette.ground);
        let adjPool;
        if (hue >= 330 || hue < 20) adjPool = this.nameParts.adjectives.reds;
        else if (hue < 45) adjPool = this.nameParts.adjectives.oranges;
        else if (hue < 65) adjPool = this.nameParts.adjectives.yellows;
        else if (hue < 150) adjPool = this.nameParts.adjectives.greens;
        else if (hue < 190) adjPool = this.nameParts.adjectives.cyans;
        else if (hue < 250) adjPool = this.nameParts.adjectives.blues;
        else if (hue < 290) adjPool = this.nameParts.adjectives.purples;
        else if (hue < 330) adjPool = this.nameParts.adjectives.pinks;
        else adjPool = this.nameParts.adjectives.neutrals;
        if (Math.random() < 0.3) {
            adjPool = adjPool.concat(this.nameParts.adjectives.neutrals);
        }
        const adj = adjPool[Math.floor(Math.random() * adjPool.length)];
        const noun = this.nameParts.nouns[Math.floor(Math.random() * this.nameParts.nouns.length)];
        return { en: `${adj.en.toUpperCase()} ${noun.en.toUpperCase()}`, ch: `${adj.ch}${noun.ch}` };
    },
    _hslToHex: function(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    },
    generatePalette: function() {
        // ... (rest of the function is the same, no need to include here for brevity)
        const baseHue = Math.random() * 360;
        const saturation = random(40, 70);
        const lightness = random(30, 60);

        // 视觉优化：调整模型权重，优先使用和谐的邻近色
        const rand = Math.random();
        let model;
        if (rand < 0.7) { // 70% 概率
            model = 'analogous';
        } else if (rand < 0.9) { // 20% 概率
            model = 'split';
        } else { // 10% 概率
            model = 'triadic';
        }

        let sky1, sky2, ground, mountNear, mountFar, accent, sun, fog;

        switch (model) {
            case 'analogous': // 相似色 (最和谐)
                sky1 = this._hslToHex(baseHue, saturation, lightness + 15);
                sky2 = this._hslToHex((baseHue + 30) % 360, saturation, lightness);
                ground = this._hslToHex((baseHue + 60) % 360, saturation - 20, lightness - 20);
                mountNear = this._hslToHex((baseHue + 45) % 360, saturation - 15, lightness - 10);
                mountFar = this._hslToHex((baseHue + 15) % 360, saturation - 10, lightness + 5);
                accent = this._hslToHex(baseHue, 100, 95);
                sun = this._hslToHex((baseHue + 15) % 360, saturation + 20, 90);
                fog = this._hslToHex((baseHue + 30) % 360, saturation - 10, lightness + 10);
                break;

            case 'triadic': // 三色系 (高对比度，已优化)
                const hue2 = (baseHue + 120) % 360;
                const hue3 = (baseHue + 240) % 360;
                sky1 = this._hslToHex(baseHue, saturation, lightness + 10);
                sky2 = this._hslToHex(baseHue, saturation - 10, lightness - 5);
                ground = this._hslToHex(hue2, saturation - 10, lightness - 15);
                mountNear = this._hslToHex(hue2, saturation, lightness - 5);
                // 视觉优化：远景山脉使用天空的色相，但降低饱和度，模拟大气透视，避免撞色
                mountFar = this._hslToHex(baseHue, saturation - 30, lightness + 10);
                accent = this._hslToHex(hue3, saturation + 20, 80); // 强调色仍然使用第三色
                sun = this._hslToHex(baseHue, 90, 90);
                fog = this._hslToHex(hue2, saturation - 30, lightness + 15);
                break;

            case 'split': // 分裂互补色 (默认，已优化)
            default:
                sky1 = this._hslToHex(baseHue, saturation, lightness + 10);
                sky2 = this._hslToHex((baseHue + 20) % 360, saturation, lightness - 10);
                const complementHue1 = (baseHue + 150) % 360;
                const complementHue2 = (baseHue + 210) % 360;
                ground = this._hslToHex(complementHue1, saturation - 10, lightness - 15);
                mountNear = this._hslToHex(complementHue1, saturation - 20, lightness - 5);
                // 视觉优化：远景山脉使用天空的色相，模拟大气透视
                mountFar = this._hslToHex(baseHue, saturation - 35, lightness + 15);
                accent = this._hslToHex(complementHue2, saturation + 20, lightness + 30); // 强调色使用另一个互补色
                sun = this._hslToHex((baseHue + 40) % 360, saturation + 10, 90);
                fog = this._hslToHex(complementHue1, saturation - 30, lightness + 15);
                break;
        }

        return { sky: [sky1, sky2], ground, mountNear, mountFar, accent, sun, fog };
    },
    generateParams: function() {
        return {
            sunSize: random(20, 150),
            sunY: random(0.15, 0.6),
            fogAlpha: random(0.1, 0.35),
            propType: this.baseThemes[Math.floor(Math.random() * this.baseThemes.length)].propType,
            terrainStyle: this.baseThemes[Math.floor(Math.random() * this.baseThemes.length)].terrainStyle,
            weather: this.baseThemes[Math.floor(Math.random() * this.baseThemes.length)].weather,
        };
    },
    generateNextTheme: function() {
        const palette = this.generatePalette();
        const name = this.generateName(palette);
        const params = this.generateParams();
        const newTheme = {
            name: name,
            sky: palette.sky,
            sun: palette.sun, sunSize: params.sunSize, sunY: params.sunY,
            mountFar: palette.mountFar, mountNear: palette.mountNear, ground: palette.ground,
            accent: palette.accent, fogColor: palette.fog, fogAlpha: params.fogAlpha,
            propType: params.propType, terrainStyle: params.terrainStyle, weather: params.weather,
            tags: []
        };
        const groundColor = hexToRgb(newTheme.ground);
        const avgColor = (groundColor[0] + groundColor[1] + groundColor[2]) / 3;
        if (avgColor < 80) newTheme.tags.push('dark');
        if (avgColor > 180) newTheme.tags.push('bright');
        if (newTheme.terrainStyle === 'ocean') newTheme.tags.push('ocean');
        if (newTheme.terrainStyle === 'mountain') newTheme.tags.push('mountain');
        if (newTheme.terrainStyle === 'jagged') newTheme.tags.push('jagged');
        if (newTheme.terrainStyle === 'cityscape') newTheme.tags.push('city');
        if (newTheme.weather === 'snow') newTheme.tags.push('cold');
        if (newTheme.weather === 'rain') newTheme.tags.push('rainy');
        if (newTheme.weather === 'embers') newTheme.tags.push('fire');
        if (Math.random() < 0.2) newTheme.tags.push('ruins');
        if (Math.random() < 0.1) newTheme.tags.push('magic');
        if (Math.random() < 0.1) newTheme.tags.push('void');
        if (Math.random() < 0.15 && newTheme.tags.includes('rainy')) newTheme.tags.push('stormy');
        if (newTheme.tags.includes('cold') && Math.random() < 0.3) newTheme.tags.push('aurora');
        return newTheme;
    }
};

// --- All other functions (update, draw, etc.) go here, unchanged for now ---
// ...
// --- Main Game Logic Functions ---

// Most functions like update, draw, generateWorldEntities, etc. are kept as is for now.
// They will be called from within the Vue lifecycle hooks.
// Minor adjustments will be needed to access reactive state (e.g., state.player instead of just player).

// All the functions from the original game.js go here...
// e.g. function update(deltaTime, timestamp) { ... }
//      function draw(timestamp) { ... }
//      ... etc ...
/**
 * ASCENSION ENGINE 3.0: CINEMATIC FLOW
 * 核心升级点：Smoothstep过渡，速度动态控制，Lighter模式拖尾
 */

// --- 核心交互与循环 ---

function startMusic() {
    if (!isMusicStarted && bgMusicRef.value && bgMusicRef.value.paused) {
        bgMusicRef.value.play().catch(e => console.error("Audio play failed:", e));
        isMusicStarted = true;
    }
}

// Event handlers will be attached in onMounted
const handleKeyDown = (e) => {
    if (e.code === 'Space' || e.code === 'KeyD') {
        state.isAccelerating = true;
        startMusic();
    }
};

const handleKeyUp = (e) => {
    if (e.code === 'Space' || e.code === 'KeyD') state.isAccelerating = false;
};

const handleMouseDown = () => {
    state.isAccelerating = true;
    startMusic();
};

const handleMouseUp = () => {
    state.isAccelerating = false;
};

const handleTouchStart = (e) => {
    e.preventDefault();
    state.isAccelerating = true;
    startMusic();
};

const handleTouchEnd = (e) => {
    e.preventDefault();
    state.isAccelerating = false;
};

const handleVisibilityChange = () => {
    if (document.hidden) {
        isPaused = true;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else {
        isPaused = false;
        if (!animationFrameId) {
            lastTimestamp = performance.now();
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }
};


// --- 游戏循环与暂停/恢复 ---
function gameLoop(timestamp) {
    if (isPaused) {
        lastTimestamp = timestamp;
        return;
    }

    let deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (deltaTime > 100) {
        deltaTime = 16.667;
    }

    update(deltaTime, timestamp);
    draw(timestamp);

    animationFrameId = requestAnimationFrame(gameLoop);
}

// All other functions are defined here...
// --- 初始化 ---
function resize() {
    if (!canvasRef.value) return;
    w = canvasRef.value.width = window.innerWidth;
    h = canvasRef.value.height = window.innerHeight;
    state.player.x = w * CFG.playerInitialX;
    state.player.y = h * 0.5;
}

// ... (All other functions from game.js would be defined here, unchanged)
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
        isSceneNameVisible.value = false;
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

        // 引擎核心切换逻辑
        state.currentTheme = state.nextTheme;
        state.nextTheme = Director.generateNextTheme();

        // 更新文本并淡入
        sceneNameText.value = state.currentTheme.name[UILang];
        isSceneNameVisible.value = true;
        state.isFadingOut = false; // 重置淡出状态
        state.transitionProgress = 0; // 重置进度
    }

    // 4. 世界生成
    generateWorldEntities();
    updateTerrain();
    updateWeather();
    updateNpcs(); // <-- 新增：调用NPC更新逻辑

    // --- 5. 场景演出 (Cinematics) ---
    handleCinematicEvents();
    updateDistantEntities();
    updateAurora(timestamp);
}

function draw(timestamp) {
    const progress = state.transitionProgress;

    const T1 = state.currentTheme;
    const T2 = state.nextTheme;

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

    // --- 新增: 1.5 天幕效果 (极光) ---
    drawAurora(ctx, C);

    // --- 2. 太阳/月亮 (Bloom Glow) ---
    ctx.save();
    const sunX = w * 0.8;
    const sunY = h * C.sunY; // 使用插值后的 Y 坐标

    // 2.2 过渡时的光晕脉冲效果
    let pulseFactor = 1.0;

    ctx.globalCompositeOperation = 'screen';
    const safeR0 = Math.max(1, (C.sunSize / 2) * pulseFactor);
    const safeR1 = Math.max(2, (C.sunSize * 5) * pulseFactor);
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

    // --- 新增: 3.5 远景实体 ---
    drawDistantEntities(ctx, C);

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
    drawGroundAndProps(ctx, C, progress, timestamp);

    // --- 6. 玩家 (光之丝带) ---
    drawPlayer(ctx, C);

    // --- 6. 绘制NPCs ---
    drawNpcs(ctx, C);

    // --- 7. 玩家 (光之丝带) ---
    drawPlayer(ctx, C);

    // --- 8. 前景粒子 ---
    drawParticles(ctx, C, 1.0); // 前景粒子最清晰

    // --- 新增：8.5 闪电效果 ---
    if (state.lightning.alpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${state.lightning.alpha})`;
        ctx.fillRect(0, 0, w, h);
    }

    // --- 9. 天气效果 ---
    drawWeather(ctx, C);

    ctx.globalCompositeOperation = 'source-over';
}

function handleCinematicEvents() {
    const T1 = state.currentTheme;

    // --- 过渡事件：流星雨 (基于标签) ---
    if (T1.tags.includes('void') && state.transitionProgress > 0.4 && state.transitionProgress < 0.6) {
        if (Math.random() < 0.2) { // 密度控制
            // 创建一颗流星
            state.weatherParticles.push({
                x: random(0, w),
                y: -20,
                vx: 15 + random(-5, 5), // 高速
                vy: 15 + random(-5, 5),
                life: 1,
                size: random(1, 2.5),
                type: 'meteor' // 新的粒子类型
            });
        }
    }
}

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

function updateWeather() {
    // 1. 清理死去的粒子
    state.weatherParticles = state.weatherParticles.filter(p => p.life > 0);

    // 2. 获取当前天气类型
    const theme = state.currentTheme; // FIX: Use the current theme object, not the old index.
    if (!theme) return; // Defensive check for stability during theme transitions.
    const weatherType = theme.weather;
    if (weatherType === 'none') return;

    // 3. 生成新粒子
    const density = { rain: 0.5, snow: 0.1, windy: 0.3, embers: 0.4, spores: 0.2 };
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
        } else if (weatherType === 'embers') {
            p.y = h + 10; // 从底部飘起
            p.vx = random(-1, 1) - state.player.velocity.x * 0.05;
            p.vy = -random(1, 4); // 向上飘
            p.size = random(1, 3);
        } else if (weatherType === 'spores') {
            p.vx = random(-0.5, 0.5) + state.player.velocity.x * 0.02;
            p.vy = random(0.5, 1.5);
            p.size = random(2, 5);
            p.wave = random(0, Math.PI * 2); // 用于实现左右摇摆
        } else if (weatherType === 'petals') {
            p.vx = random(-0.8, 0.8) + state.player.velocity.x * 0.03;
            p.vy = random(0.8, 2);
            p.size = random(4, 8);
            p.wave = random(0, Math.PI * 2);
        } else if (weatherType === 'energy_motes') {
            p.vx = random(-0.2, 0.2);
            p.vy = random(-0.2, 0.2); // 自由漂浮
            p.size = random(1, 3);
        } else if (weatherType === 'waterfall_spray') {
            p.y = random(0, h);
            p.vx = -state.player.velocity.x * 0.1 - random(1, 2);
            p.vy = random(2, 4); // 向下飘散的水雾
            p.size = random(10, 20);
        } else if (weatherType === 'sandstorm') {
            p.y = random(0, h);
            p.x = w + 20;
            p.vx = state.player.velocity.x * 2.5 + random(15, 25); // 强风
            p.vy = random(-1, 1);
            p.size = random(1, 3);
        } else if (weatherType === 'steam') {
            p.y = h + 10; // 从底部升起
            p.vx = random(-0.5, 0.5) - state.player.velocity.x * 0.05;
            p.vy = -random(2, 5); // 向上
            p.size = random(20, 40);
        } else if (weatherType === 'glowing_dust') {
            p.vx = random(-0.3, 0.3) - state.player.velocity.x * 0.01;
            p.vy = random(-0.3, 0.3); // 缓慢漂浮
            p.size = random(1, 2);
        } else if (weatherType === 'memory_fragments') {
            p.vx = random(-0.1, 0.1) - state.player.velocity.x * 0.01;
            p.vy = random(-0.1, 0.1);
            p.size = random(20, 50);
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

    // --- 新增：天气事件 - 闪电 ---
    if (state.lightning.alpha > 0) {
        state.lightning.alpha -= 0.05; // 闪电淡出
    }

    if (theme.tags.includes('stormy') && theme.weather === 'rain') {
        state.lightning.timer--;
        if (state.lightning.timer <= 0) {
            state.lightning.alpha = random(0.8, 1.2); // 触发闪电
            state.lightning.timer = random(120, 500); // 重置计时器
        }
    } else {
        // 如果不是风暴雨天，则确保闪电计时器和效果被重置
        state.lightning.timer = 200;
        state.lightning.alpha = 0;
    }
}

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

    const theme1 = state.currentTheme;
    const theme2 = state.nextTheme;
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
        const T1 = state.currentTheme;
        const T2 = state.nextTheme;
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
            type: state.currentTheme.propType
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

function updateAurora(timestamp) {
    const theme = state.currentTheme;
    if (!theme.tags.includes('aurora')) {
        state.aurora.bands = []; // 如果场景没有aurora标签，则清空
        return;
    }

    // 如果是极光场景，但还没有极光带，则初始化
    if (state.aurora.bands.length === 0) {
        for (let i = 0; i < 3; i++) { // 创建3条主要光带
            state.aurora.bands.push({
                y: random(h * 0.1, h * 0.4),
                height: random(50, 150),
                color: [random(180, 220), random(80, 120), random(200, 255)], // 偏绿/蓝/紫
                segments: 50,
                noiseSpeed: random(0.05, 0.1)
            });
        }
    }

    // 更新每条光带的形状
    state.aurora.bands.forEach(band => {
        for (let i = 0; i <= band.segments; i++) {
            const noiseX = i * band.noiseSpeed + timestamp / 1000;
            const displacement = auroraNoise.get(noiseX) * 100 - 50;
            band.shapePoints = band.shapePoints || [];
            band.shapePoints[i] = displacement;
        }
    });
}

function drawAurora(ctx, C) {
    if (state.aurora.bands.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    state.aurora.bands.forEach(band => {
        const grad = ctx.createLinearGradient(0, band.y - band.height, 0, band.y + band.height);
        grad.addColorStop(0, `rgba(${band.color[0]}, ${band.color[1]}, ${band.color[2]}, 0)`);
        grad.addColorStop(0.5, `rgba(${band.color[0]}, ${band.color[1]}, ${band.color[2]}, 0.15)`);
        grad.addColorStop(1, `rgba(${band.color[0]}, ${band.color[1]}, ${band.color[2]}, 0)`);

        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, band.y + band.shapePoints[0]);

        for (let i = 1; i <= band.segments; i++) {
            const x = (w / band.segments) * i;
            const y = band.y + band.shapePoints[i];
            ctx.lineTo(x, y);
        }

        // 封闭路径以填充
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
    });

    ctx.restore();
}

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
        } else if (p.type === 'embers') {
            ctx.fillStyle = `rgba(255, 172, 61, ${p.life * 0.8})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = C.accent;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'spores') {
            p.wave += 0.05;
            const xOffset = Math.sin(p.wave) * 5;
            ctx.fillStyle = `rgba(0, 255, 240, ${p.life * 0.7})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = C.accent;
            ctx.beginPath();
            ctx.arc(p.x + xOffset, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'meteor') {
            const tailLength = p.size * 20;
            const grad = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * tailLength, p.y - p.vy * tailLength);
            grad.addColorStop(0, `rgba(255, 255, 255, ${p.life})`);
            grad.addColorStop(1, 'transparent');

            ctx.strokeStyle = grad;
            ctx.lineWidth = p.size;
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'white';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * tailLength, p.y - p.vy * tailLength);
            ctx.stroke();
        } else if (p.type === 'petals') {
            p.wave += 0.08;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(p.wave) * Math.PI * 0.25); // 旋转
            ctx.fillStyle = `rgba(136, 255, 136, ${p.life * 0.8})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2); // 椭圆形花瓣
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'energy_motes') {
            ctx.fillStyle = `rgba(255, 172, 255, ${p.life * 0.9})`;
            ctx.shadowBlur = 25;
            ctx.shadowColor = C.accent;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'waterfall_spray') {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.2})`; // 水雾非常透明
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'sandstorm') {
            ctx.fillStyle = `rgba(211, 155, 91, ${p.life * 0.5})`;
            ctx.fillRect(p.x, p.y, p.size * 5, p.size); // 拉长的沙粒
        } else if (p.type === 'steam') {
            ctx.fillStyle = `rgba(153, 163, 164, ${p.life * 0.3})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.life), 0, Math.PI * 2); // 蒸汽云会变大并消失
            ctx.fill();
        } else if (p.type === 'glowing_dust') {
            ctx.fillStyle = `rgba(255, 215, 0, ${p.life})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = C.accent;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'memory_fragments') {
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.life * 0.15})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, p.size, p.size * 0.6);
        }
    });
    ctx.restore();
}

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
    },
    'volcano': (ctx, C, p) => {
        // 绘制一个小型、风格化的火山
        ctx.fillStyle = '#1a090d'; // 火山岩的深色
        ctx.beginPath();
        ctx.moveTo(-20 * p.scale, 0);
        ctx.lineTo(20 * p.scale, 0);
        ctx.lineTo(10 * p.scale, -30 * p.scale);
        ctx.lineTo(-10 * p.scale, -30 * p.scale);
        ctx.closePath();
        ctx.fill();

        // 绘制火山口的熔岩
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, -28 * p.scale, 8 * p.scale, 3 * p.scale, 0, 0, Math.PI * 2);
        ctx.fill();
    },
    'mushrooms': (ctx, C, p) => {
        // 绘制几颗发光的蘑菇
        ctx.globalAlpha = 0.9;
        const mushroomCount = Math.floor(random(1, 4));
        for (let i = 0; i < mushroomCount; i++) {
            const xOffset = random(-15, 15) * p.scale;
            const yOffset = -random(5, 20) * p.scale;
            const height = random(10, 25) * p.scale;
            const capRadius = random(5, 12) * p.scale;

            // 菌柄
            ctx.strokeStyle = '#a9d5ff'; // 用月光色
            ctx.lineWidth = 2 * p.scale;
            ctx.beginPath();
            ctx.moveTo(xOffset, 0);
            ctx.lineTo(xOffset, yOffset - height);
            ctx.stroke();

            // 菌盖
            ctx.fillStyle = C.accent;
            ctx.beginPath();
            ctx.arc(xOffset, yOffset - height, capRadius, Math.PI, 0);
            ctx.fill();
        }
    },
    'floating_islands': (ctx, C, p) => {
        // 绘制一个带有植被的浮空小岛
        ctx.fillStyle = C.mountFar; // 岛屿底部颜色
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.ellipse(0, 0, 30 * p.scale, 15 * p.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 岛屿顶部（云层或植被）
        ctx.fillStyle = C.ground;
        ctx.beginPath();
        ctx.ellipse(0, -10 * p.scale, 25 * p.scale, 10 * p.scale, 0, 0, Math.PI * 2);
        ctx.fill();
    },
    'branches': (ctx, C, p) => {
        // 绘制风格化的巨大树枝
        ctx.strokeStyle = '#0f3a3a'; // 树枝的深色
        ctx.lineWidth = random(5, 15) * p.scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
            random(-20, 20), -30 * p.scale,
            random(30, 70), -80 * p.scale,
            random(80, 120), -120 * p.scale
        );
        ctx.stroke();
    },
    'crystal_clusters': (ctx, C, p) => {
        // 绘制一簇发光的水晶
        const crystalCount = Math.floor(random(3, 7));
        for (let i = 0; i < crystalCount; i++) {
            ctx.fillStyle = `rgba(255, 172, 255, ${random(0.3, 0.8)})`;
            ctx.beginPath();
            const x = random(-20, 20) * p.scale;
            const h = random(20, 60) * p.scale;
            const w = random(5, 15) * p.scale;
            ctx.moveTo(x, 0);
            ctx.lineTo(x - w, -h);
            ctx.lineTo(x, -h * 1.2);
            ctx.lineTo(x + w, -h);
            ctx.closePath();
            ctx.fill();
        }
    },
    'icebergs': (ctx, C, p) => {
        // 绘制浮冰
        ctx.fillStyle = `rgba(255, 255, 255, ${random(0.7, 0.9)})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(random(20, 40) * p.scale, random(-10, 10));
        ctx.lineTo(random(10, 30) * p.scale, -random(20, 50) * p.scale);
        ctx.lineTo(random(-10, 10) * p.scale, -random(30, 60) * p.scale);
        ctx.lineTo(random(-20, -30) * p.scale, -random(10, 40) * p.scale);
        ctx.closePath();
        ctx.fill();
    },
    'corals': (ctx, C, p) => {
        // 绘制风格化的珊瑚
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = random(2, 5) * p.scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -random(20, 50) * p.scale);
        ctx.stroke();
    },
    'ancient_pillars': (ctx, C, p) => {
        // 绘制覆盖着藤蔓的古代柱子
        ctx.fillStyle = C.mountNear;
        ctx.fillRect(-10 * p.scale, -random(50, 150) * p.scale, 20 * p.scale, random(50, 150) * p.scale);
        // 藤蔓
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10 * p.scale, 0);
        ctx.quadraticCurveTo(0, -50 * p.scale, 10 * p.scale, -100 * p.scale);
        ctx.stroke();
    },
    'colossus_parts': (ctx, C, p) => {
        // 绘制被沙子半掩埋的巨像部件，例如一只手
        ctx.fillStyle = C.mountNear;
        ctx.beginPath();
        ctx.moveTo(-30 * p.scale, 0);
        ctx.lineTo(-20 * p.scale, -40 * p.scale); // 手指
        ctx.lineTo(0, -35 * p.scale); // 手指
        ctx.lineTo(20 * p.scale, -45 * p.scale); // 手指
        ctx.lineTo(30 * p.scale, -10 * p.scale); // 手掌
        ctx.closePath();
        ctx.fill();
    },
    'gears_and_pipes': (ctx, C, p) => {
        // 绘制齿轮和管道
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 8 * p.scale;
        ctx.beginPath();
        ctx.arc(0, -30 * p.scale, 20 * p.scale, 0, Math.PI * 1.5); // 管道
        ctx.stroke();

        ctx.fillStyle = C.mountNear;
        ctx.beginPath();
        ctx.arc(random(-20, 20), -random(20, 40), 15 * p.scale, 0, Math.PI * 2); // 齿轮
        ctx.fill();
    },
    'flying_books': (ctx, C, p) => {
        // 绘制一本打开的、正在飞舞的书
        ctx.fillStyle = '#8b4513'; // 书皮
        ctx.beginPath();
        ctx.moveTo(-15 * p.scale, 0);
        ctx.quadraticCurveTo(0, -10 * p.scale, 15 * p.scale, 0);
        ctx.quadraticCurveTo(0, 10 * p.scale, -15 * p.scale, 0);
        ctx.fill();

        ctx.fillStyle = C.accent; // 书页
        ctx.globalAlpha = 0.8;
        ctx.fillText("...", -5, -2); // 象征性的文字
    },
    'reflection_shards': (ctx, C, p) => {
        // 绘制反射光线的碎片
        ctx.strokeStyle = `rgba(255, 255, 255, ${random(0.5, 1)})`;
        ctx.lineWidth = random(1, 3);
        ctx.beginPath();
        ctx.moveTo(random(-20, 20), -random(0, 40));
        ctx.lineTo(random(-20, 20), -random(40, 80));
        ctx.stroke();
    },
    'giant_toys': (ctx, C, p) => {
        // 绘制一个巨大的积木块
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 1.0;
        ctx.fillRect(-20 * p.scale, -40 * p.scale, 40 * p.scale, 40 * p.scale);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(-20 * p.scale, -40 * p.scale, 40 * p.scale, 40 * p.scale);
    },
    'energy_strings': (ctx, C, p) => {
        // 绘制振动的能量弦
        ctx.strokeStyle = `rgba(255, 0, 255, ${random(0.3, 0.9)})`;
        ctx.lineWidth = random(1, 4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
            random(-5, 5), -50,
            random(-5, 5), -150,
            0, -200
        );
        ctx.stroke();
    },
    'glitches': (ctx, C, p) => {
        // 绘制红色的故障方块
        ctx.fillStyle = C.accent;
        ctx.fillRect(random(-10, 10), -random(0, 50), random(5, 15), random(5, 15));
    }
};

function drawGroundAndProps(ctx, C, progress, timestamp) {
    // --- 从区块绘制地面 ---
    drawTerrainLayerFromChunks(ctx, C.ground, 2, progress); // 2是地面的图层索引

    // --- 新增：地之火 - 脉动的熔岩裂隙 ---
    const theme = state.currentTheme;
    if (theme.tags.includes('fire')) {
        const pulseAlpha = 0.6 + Math.sin(timestamp / 400) * 0.4; // 脉动透明度

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 172, 61, ${pulseAlpha})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = C.accent;

        // 复用地形绘制逻辑来画裂隙，但使用不同的路径
        ctx.beginPath();
        const startChunkId = Math.floor(state.worldScrollX / CFG.CHUNK_WIDTH);
        const endChunkId = Math.floor((state.worldScrollX + w) / CFG.CHUNK_WIDTH);
        const step = CFG.CHUNK_WIDTH / CFG.CHUNK_RESOLUTION;

        for (let id = startChunkId; id <= endChunkId; id++) {
            const chunk = state.terrain.chunks.get(id);
            if (!chunk) continue;
            const layerData = chunk.layers[2]; // 地面层
            if (!layerData) continue;
            for (let i = 0; i < layerData.length; i++) {
                const pointData = layerData[i];
                const screenX = chunk.worldX + i * step - state.worldScrollX;
                const y = lerp(pointData.y1, pointData.y2, progress);
                // 稍微偏移裂隙，使其看起来在地面之下
                ctx.lineTo(screenX, y + 5 + Math.sin(i * 0.5) * 2);
            }
        }
        ctx.stroke();
        ctx.restore();
    }


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
            const step = CFG.CHUNK_WIDTH / CFG.CHUNK_RESOLUTION;
            const xInChunk = p.worldX - chunk.worldX;
            const pointIndexFloat = xInChunk / step;

            const index1 = Math.floor(pointIndexFloat);
            const index2 = index1 + 1;

            const pointData1 = chunk.layers[2]?.[index1];
            const pointData2 = chunk.layers[2]?.[index2];

            if (pointData1 && pointData2) {
                const t = pointIndexFloat - index1;
                const y1 = lerp(pointData1.y1, pointData1.y2, progress);
                const y2 = lerp(pointData2.y1, pointData2.y2, progress);
                groundY = lerp(y1, y2, t);
            } else if (pointData1) {
                groundY = lerp(pointData1.y1, pointData1.y2, progress);
            }
        }

        ctx.save();
        ctx.translate(x, groundY);
        ctx.scale(p.scale, p.scale);
        ctx.rotate(p.rot);

        // --- 新增：风之语 - 互动式植物摇曳 ---
        const theme = state.currentTheme;
        const plantTypes = ['grass', 'branches', 'leaf', 'corals', 'mushrooms'];
        if (theme.tags.includes('nature') && plantTypes.includes(p.type)) {
            const windStrength = state.player.velocity.x / CFG.playerMaxSpeed;
            // [修复] 移除 timestamp 依赖，只根据世界坐标计算基础摆动
            const swayAngle = Math.sin(p.worldX / 50) * 0.1 + windStrength * -0.5;
            ctx.rotate(swayAngle);
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = C.accent;

        // 调用专属的绘制函数
        drawer(ctx, C, p);

        ctx.restore();
    });
}

function drawPlayer(ctx, C) {
    const p = state.player;

    // 1. 拖尾 (基于历史速度的分段渲染)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (p.trail.length > 2) {
        for (let i = 1; i < p.trail.length - 2; i++) {
            const point = p.trail[i];
            const nextPoint = p.trail[i + 1];

            const xc = (point.x + nextPoint.x) / 2;
            const yc = p.y; // Keep the trail horizontal

            ctx.beginPath();
            ctx.moveTo(point.x, p.y);
            ctx.quadraticCurveTo(point.x, p.y, xc, yc);

            // Width is based on the speed when the trail point was created
            const lineWidth = Math.max(1, 4 + point.speed * 0.6);
            // Alpha fades out towards the tail
            const alpha = (i / p.trail.length) * 0.5;

            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = lineWidth;
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

function updateDistantEntities() {
    // 1. 清理生命周期结束的实体
    state.distantEntities = state.distantEntities.filter(e => e.life > 0 && e.x > -200);

    // 2. 根据当前场景生成新实体 (基于标签)
    const theme = state.currentTheme;

    if (theme.tags.includes('heavenly') && theme.tags.includes('city') && Math.random() < 0.01 && state.distantEntities.length < 3) {
        state.distantEntities.push({
            type: 'fleet',
            x: w + 150,
            y: random(h * 0.2, h * 0.5),
            vx: -random(0.2, 0.5), // 非常缓慢
            life: 1, // 持续存在，直到移出屏幕
            scale: random(0.5, 1.2)
        });
    }

    if (theme.tags.includes('fire') && theme.tags.includes('hostile') && Math.random() < 0.02) {
        state.distantEntities.push({
            type: 'geyser',
            x: random(0, w),
            y: h, // 从底部开始
            vy: -random(3, 6),
            life: random(0.1, 0.3), // 短暂喷发
            maxHeight: random(h * 0.4, h * 0.7),
            particles: []
        });
    }

    if (theme.tags.includes('ocean') && theme.tags.includes('colorful') && Math.random() < 0.005 && !state.distantEntities.some(e => e.type === 'whale')) {
        state.distantEntities.push({
            type: 'whale',
            x: w + 300,
            y: random(h * 0.3, h * 0.7),
            vx: -0.1, // 极其缓慢
            life: 1,
            scale: random(1, 1.5)
        });
    }

    if (theme.tags.includes('cave') && theme.tags.includes('magic') && Math.random() < 0.015) {
        state.distantEntities.push({
            type: 'resonance',
            x: random(0, w),
            y: random(h * 0.5, h * 0.8),
            life: 1,
            radius: 0,
            maxRadius: random(50, 150)
        });
    }

    if (theme.tags.includes('ruins') && theme.tags.includes('giant') && Math.random() < 0.008 && !state.distantEntities.some(e => e.type === 'colossus_head')) {
        state.distantEntities.push({
            type: 'colossus_head',
            x: w * 0.7,
            y: h * 0.6,
            life: 1, // 持续存在
            eyeGlow: 0,
            eyeGlowTimer: random(100, 300)
        });
    }

    if (theme.tags.includes('steampunk') && !state.distantEntities.some(e => e.type === 'clock_tower')) {
        state.distantEntities.push({
            type: 'clock_tower',
            x: w * 0.8,
            y: h * 0.7,
            life: 1,
            angle: 0
        });
    }

    if (theme.tags.includes('glitch') && Math.random() < 0.1) {
        state.distantEntities.push({
            type: 'glitch_effect',
            x: random(0, w),
            y: random(0, h),
            life: random(0.05, 0.2),
            width: random(50, 200),
            height: random(5, 20)
        });
    }

    if (theme.tags.includes('sci-fi') && theme.tags.includes('void') && Math.random() < 0.03) {
        state.distantEntities.push({
            type: 'string_pluck',
            x: random(0, w),
            life: 1,
            amplitude: random(10, 30)
        });
    }

    // 3. 更新实体状态
    state.distantEntities.forEach(e => {
        if (e.type === 'fleet' || e.type === 'whale') {
            e.x += e.vx;
        } else if (e.type === 'geyser') {
            if (e.y > e.maxHeight) {
                e.y += e.vy;
                // 生成粒子
                if (Math.random() < 0.5) {
                    e.particles.push({ x: e.x + random(-10, 10), y: e.y, life: 1 });
                }
            }
            e.life -= 0.005;

            // 更新粒子
            e.particles = e.particles.filter(p => p.life > 0);
            e.particles.forEach(p => {
                p.y += 1; // 粒子下落
                p.life -= 0.02;
            });
        } else if (e.type === 'resonance') {
            e.radius += 1.5;
            e.life = 1 - (e.radius / e.maxRadius);
        } else if (e.type === 'colossus_head') {
            e.eyeGlowTimer--;
            if (e.eyeGlowTimer < 0) {
                e.eyeGlow += 0.05;
                if (e.eyeGlow > 1) {
                    e.eyeGlow = 0;
                    e.eyeGlowTimer = random(200, 500);
                }
            }
        } else if (e.type === 'clock_tower') {
            e.angle += 0.0005;
        } else if (e.type === 'glitch_effect') {
            e.life -= 0.01;
        } else if (e.type === 'string_pluck') {
            e.amplitude *= 0.9; // 振幅衰减
            if (e.amplitude < 0.1) e.life = 0;
        }
    });
}

function drawDistantEntities(ctx, C) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; // 确保正常绘制

    state.distantEntities.forEach(e => {
        ctx.globalAlpha = 0.5 * e.life; // 远景实体都比较透明

        switch(e.type) {
            case 'fleet':
                ctx.fillStyle = '#ffffff'; // 白色船体
                ctx.shadowBlur = 20;
                ctx.shadowColor = C.sun;

                // 绘制一个风格化的飞艇形状
                ctx.beginPath();
                ctx.ellipse(e.x, e.y, 80 * e.scale, 20 * e.scale, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'geyser':
                // 绘制岩浆粒子
                ctx.fillStyle = C.accent;
                ctx.shadowBlur = 15;
                ctx.shadowColor = C.accent;
                e.particles.forEach(p => {
                    ctx.globalAlpha = 0.8 * p.life;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, random(2, 5), 0, Math.PI * 2);
                    ctx.fill();
                });
                break;

            case 'whale':
                // 绘制巨大的、半透明的鲸鱼轮廓
                ctx.fillStyle = `rgba(255, 255, 255, 0.1)`; // 非常透明
                ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 30;
                ctx.shadowColor = C.sun;

                ctx.beginPath();
                ctx.moveTo(e.x, e.y);
                ctx.bezierCurveTo(e.x - 100 * e.scale, e.y - 50 * e.scale, e.x - 200 * e.scale, e.y, e.x - 300 * e.scale, e.y + 20 * e.scale);
                ctx.bezierCurveTo(e.x - 250 * e.scale, e.y + 60 * e.scale, e.x - 150 * e.scale, e.y + 40 * e.scale, e.x, e.y);
                ctx.fill();
                ctx.stroke();
                break;

            case 'resonance':
                // 绘制扩张的能量环
                ctx.strokeStyle = C.accent;
                ctx.lineWidth = 3 * e.life;
                ctx.shadowBlur = 20;
                ctx.shadowColor = C.accent;

                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case 'colossus_head':
                // 绘制巨像的头部轮廓
                ctx.fillStyle = C.mountFar;
                ctx.beginPath();
                ctx.moveTo(e.x, e.y);
                ctx.lineTo(e.x - 50, e.y - 150);
                ctx.lineTo(e.x + 50, e.y - 150);
                ctx.lineTo(e.x + 80, e.y);
                ctx.fill();

                // 绘制发光的眼睛
                ctx.fillStyle = `rgba(255, 255, 255, ${e.eyeGlow})`;
                ctx.shadowBlur = 30;
                ctx.shadowColor = 'white';
                ctx.beginPath();
                ctx.arc(e.x, e.y - 100, 10, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'clock_tower':
                // 绘制钟楼
                ctx.fillStyle = C.mountNear;
                ctx.fillRect(e.x - 20, e.y - 200, 40, 200);

                // 绘制钟面和指针
                ctx.save();
                ctx.translate(e.x, e.y - 200);
                ctx.rotate(e.angle);
                ctx.strokeStyle = C.accent;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -30);
                ctx.stroke();
                ctx.restore();
                break;

            case 'glitch_effect':
                ctx.fillStyle = C.accent;
                ctx.globalAlpha = e.life * 5; // Glitch 效果更明显
                ctx.fillRect(e.x, e.y, e.width, e.height);
                break;

            case 'string_pluck':
                ctx.strokeStyle = C.accent;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = C.accent;

                ctx.beginPath();
                ctx.moveTo(e.x, 0);
                ctx.quadraticCurveTo(e.x + Math.sin(e.life * 10) * e.amplitude, h / 2, e.x, h);
                ctx.stroke();
                break;
        }
    });

    ctx.restore();
}

onMounted(() => {
    // Initialization
    ctx = canvasRef.value.getContext('2d', { alpha: false });
    Director.init();

    // Set initial theme
    state.currentTheme = Director.generateNextTheme();
    state.nextTheme = Director.generateNextTheme();
    sceneNameText.value = state.currentTheme.name[UILang];
    isSceneNameVisible.value = true;

    // Initial resize
    resize();

    // Add event listeners
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start game loop
    lastTimestamp = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
});

onUnmounted(() => {
    // Cleanup
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
});

</script>

<style scoped>
/* Scoped styles can be added here if needed */
</style>
