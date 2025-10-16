document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('planetCanvas');
    const ctx = canvas.getContext('2d');
    const cloudCanvas = document.getElementById('cloudCanvas');
    const cloudCtx = cloudCanvas.getContext('2d');

    // Control elements
    const seedInput = document.getElementById('seed');
    const randomizeSeedBtn = document.getElementById('randomize-seed');
    const oceanLevelSlider = document.getElementById('ocean-level');
    const terrainRoughnessSlider = document.getElementById('terrain-roughness');
    const terrainDetailSlider = document.getElementById('terrain-detail');
    const mountainPeaksSlider = document.getElementById('mountain-peaks');
    const planetThemeSelect = document.getElementById('planet-theme');
    const generateBtn = document.getElementById('generate-planet');
    const downloadBtn = document.getElementById('download-image');
    const shareLinkInput = document.getElementById('share-link');
    const copyLinkBtn = document.getElementById('copy-link');

    let noise, cloudNoise;
    let cloudOffset = 0;

    const colorThemes = {
        'classic-earth': {
            water: '#0000FF',
            coast: '#32CD32',
            land: '#228B22',
            mountain: '#A0522D',
            peak: '#FFFFFF'
        },
        'arid-world': {
            water: '#00008B',
            coast: '#FFD700',
            land: '#DAA520',
            mountain: '#8B4513',
            peak: '#A9A9A9'
        },
        'ice-planet': {
            water: '#ADD8E6',
            coast: '#F0FFFF',
            land: '#FFFFFF',
            mountain: '#E0FFFF',
            peak: '#FFFFFF'
        }
    };

    function generatePlanet() {
        const seed = parseInt(seedInput.value);
        noise = new Noise(seed);

        const oceanLevel = parseFloat(oceanLevelSlider.value);
        const terrainRoughness = parseFloat(terrainRoughnessSlider.value);
        const terrainDetail = parseInt(terrainDetailSlider.value);
        const mountainPeaks = parseFloat(mountainPeaksSlider.value);
        const theme = colorThemes[planetThemeSelect.value];

        updateUrlHash();

        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.createImageData(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nx = x / width - 0.5;
                const ny = y / height - 0.5;

                let e = 0;
                let frequency = terrainRoughness * 10;
                let amplitude = 1;
                for (let i = 0; i < terrainDetail; i++) {
                    e += amplitude * noise.simplex2(frequency * nx, frequency * ny);
                    frequency *= 2;
                    amplitude *= 0.5;
                }

                e = (1 + e) / 2; // Normalize to 0-1
                e = Math.pow(e, mountainPeaks);

                const index = (y * width + x) * 4;
                let color;

                if (e < oceanLevel) {
                    color = hexToRgb(theme.water);
                } else if (e < oceanLevel + 0.05) {
                    color = hexToRgb(theme.coast);
                } else if (e < 0.7) {
                    color = hexToRgb(theme.land);
                } else if (e < 0.9) {
                    color = hexToRgb(theme.mountain);
                } else {
                    color = hexToRgb(theme.peak);
                }

                imageData.data[index] = color.r;
                imageData.data[index + 1] = color.g;
                imageData.data[index + 2] = color.b;
                imageData.data[index + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function randomizeSeed() {
        seedInput.value = Math.floor(Math.random() * 100000);
    }

    function updateUrlHash() {
        const params = new URLSearchParams();
        params.set('seed', seedInput.value);
        params.set('ocean', oceanLevelSlider.value);
        params.set('roughness', terrainRoughnessSlider.value);
        params.set('detail', terrainDetailSlider.value);
        params.set('mountains', mountainPeaksSlider.value);
        params.set('theme', planetThemeSelect.value);
        window.location.hash = params.toString();
        shareLinkInput.value = window.location.href;
    }

    function parseUrlHash() {
        const params = new URLSearchParams(window.location.hash.substring(1));
        if (params.has('seed')) {
            seedInput.value = params.get('seed');
            oceanLevelSlider.value = params.get('ocean');
            terrainRoughnessSlider.value = params.get('roughness');
            terrainDetailSlider.value = params.get('detail');
            mountainPeaksSlider.value = params.get('mountains');
            planetThemeSelect.value = params.get('theme');
            return true;
        }
        return false;
    }

    copyLinkBtn.addEventListener('click', () => {
        shareLinkInput.select();
        document.execCommand('copy');
    });

    downloadBtn.addEventListener('click', () => {
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = canvas.width;
        compositeCanvas.height = canvas.height;
        const compositeCtx = compositeCanvas.getContext('2d');
        compositeCtx.drawImage(canvas, 0, 0);
        compositeCtx.drawImage(cloudCanvas, 0, 0);

        const image = compositeCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `planet-seed-${seedInput.value}.png`;
        link.click();
    });

    generateBtn.addEventListener('click', generatePlanet);
    randomizeSeedBtn.addEventListener('click', () => {
        randomizeSeed();
        generatePlanet();
    });

    function animateClouds() {
        const width = cloudCanvas.width;
        const height = cloudCanvas.height;
        const imageData = cloudCtx.createImageData(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nx = x / width - 0.5;
                const ny = y / height - 0.5;

                let e = cloudNoise.simplex2(4 * nx + cloudOffset, 4 * ny);
                e = (1 + e) / 2; // Normalize to 0-1

                const index = (y * width + x) * 4;
                if (e > 0.6) {
                    imageData.data[index] = 255;
                    imageData.data[index + 1] = 255;
                    imageData.data[index + 2] = 255;
                    imageData.data[index + 3] = (e - 0.6) * 255 * 2;
                }
            }
        }
        cloudCtx.putImageData(imageData, 0, 0);
        cloudOffset += 0.002;
        requestAnimationFrame(animateClouds);
    }

    // Initial generation
    if (!parseUrlHash()) {
        randomizeSeed();
    }
    cloudNoise = new Noise(Math.random());
    generatePlanet();
    animateClouds();
});