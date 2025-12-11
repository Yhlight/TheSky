// --- Seeded Random Number Generator ---
// Using a simple LCG (Linear Congruential Generator) for determinism
export function createSeededRandom(seed) {
    let state = seed;
    return () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}

// --- Advanced Noise Generation ---
const PERMUTATION = Array.from({ length: 256 }, (_, i) => i);
let randomFnForPermutation = createSeededRandom(Math.random()); // Internal seeding

export function reseedPermutation(seed) {
    randomFnForPermutation = createSeededRandom(seed);
    for (let i = PERMUTATION.length - 1; i > 0; i--) {
        const j = Math.floor(randomFnForPermutation() * (i + 1));
        [PERMUTATION[i], PERMUTATION[j]] = [PERMUTATION[j], PERMUTATION[i]];
    }
}

// Initialize once
reseedPermutation(Math.random());


const P = [...PERMUTATION, ...PERMUTATION];

const lerp = (a, b, t) => a + (b - a) * t;
const quintic = t => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (hash, x) => (hash & 1) === 0 ? x : -x;

export const noise = x => {
    const X = Math.floor(x) & 255;
    x -= Math.floor(x);
    const u = quintic(x);
    // P needs to be updated if reseedPermutation is called, but P is a const.
    // Let's redefine P inside the noise function to capture the latest permutation.
    const P_CURRENT = [...PERMUTATION, ...PERMUTATION];
    return lerp(grad(P_CURRENT[X], x), grad(P_CURRENT[X + 1], x - 1), u) * 2;
};


export const fbm = (x, octaves, persistence, lacunarity) => {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
        total += noise(x * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total / maxValue;
};
