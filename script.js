document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('planetCanvas');

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
    const downloadHeightmapBtn = document.getElementById('download-heightmap');
    const shareLinkInput = document.getElementById('share-link');
    const copyLinkBtn = document.getElementById('copy-link');

    let noise;
    let scene, camera, renderer, planetSphere, controls;

    const colorThemes = {
        'classic-earth': {
            water: '#0000FF',
            desert: '#F0E68C',
            grassland: '#9ACD32',
            forest: '#228B22',
            rocky: '#808080',
            snow: '#FFFFFF'
        },
        'arid-world': {
            water: '#00008B',
            desert: '#DAA520',
            grassland: '#BDB76B',
            forest: '#8B4513',
            rocky: '#A9A9A9',
            snow: '#D3D3D3'
        },
        'ice-planet': {
            water: '#ADD8E6',
            desert: '#F0FFFF',
            grassland: '#E0FFFF',
            forest: '#FFFFFF',
            rocky: '#B0C4DE',
            snow: '#FFFFFF'
        }
    };

    function generatePlanetData() {
        const seed = parseInt(seedInput.value);
        noise = new Noise(seed);
        const moistureNoise = new Noise(seed + 1); // Separate noise for moisture

        const oceanLevel = parseFloat(oceanLevelSlider.value);
        const terrainRoughness = parseFloat(terrainRoughnessSlider.value);
        const terrainDetail = parseInt(terrainDetailSlider.value);
        const mountainPeaks = parseFloat(mountainPeaksSlider.value);

        const width = 512;
        const height = 256;
        const data = new Uint8Array(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Map from 2D texture coords (u,v) to 3D sphere coords (px,py,pz)
                const u = x / width;
                const v = y / height;

                const theta = v * Math.PI;
                const phi = u * 2 * Math.PI;

                // Match THREE.SphereGeometry's vertex generation
                const px = -Math.cos(phi) * Math.sin(theta);
                const py = Math.cos(theta);
                const pz = Math.sin(phi) * Math.sin(theta);

                // Elevation (e)
                let e = 0;
                let frequency = terrainRoughness * 8;
                let amplitude = 1;
                for (let i = 0; i < terrainDetail; i++) {
                    e += amplitude * noise.simplex3(frequency * px, frequency * py, frequency * pz);
                    frequency *= 2;
                    amplitude *= 0.5;
                }
                e = (1 + e) / 2; // Normalize to 0-1
                e = Math.pow(e, mountainPeaks);

                // Moisture (m)
                let m = 0;
                let mFrequency = terrainRoughness * 2; // Different settings for moisture
                let mAmplitude = 1;
                for (let i = 0; i < terrainDetail; i++) {
                    m += mAmplitude * moistureNoise.simplex3(mFrequency * px, mFrequency * py, mFrequency * pz);
                    mFrequency *= 2;
                    mAmplitude *= 0.5;
                }
                m = (1 + m) / 2; // Normalize to 0-1


                const index = (y * width + x) * 4;
                const color = getColor(e, m, oceanLevel, planetThemeSelect.value);

                data[index] = color.r;
                data[index + 1] = color.g;
                data[index + 2] = color.b;
                data[index + 3] = 255;
            }
        }
        return { data, width, height };
    }

    function getColor(e, m, oceanLevel, themeName) {
        const theme = colorThemes[themeName];
        let color;

        if (e < oceanLevel) {
            return hexToRgb(theme.water || '#0000FF');
        }

        // Above ocean level
        if (e > 0.7) { // High elevation
            if (m < 0.5) return hexToRgb(theme.rocky || '#808080');
            else return hexToRgb(theme.snow || '#FFFFFF');
        } else { // Mid-low elevation
            if (m < 0.3) return hexToRgb(theme.desert || '#F0E68C');
            else if (m < 0.6) return hexToRgb(theme.grassland || '#9ACD32');
            else return hexToRgb(theme.forest || '#228B22');
        }
    }

    function generateAndRenderPlanet() {
        updateUrlHash();
        const planetData = generatePlanetData();
        const texture = new THREE.DataTexture(planetData.data, planetData.width, planetData.height, THREE.RGBAFormat);
        texture.needsUpdate = true;

        if (!scene) {
            initThree();
        }

        planetSphere.material.map = texture;
        planetSphere.material.needsUpdate = true;
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
        renderer.render(scene, camera);
        const image = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `planet-seed-${seedInput.value}.png`;
        link.click();
    });

    downloadHeightmapBtn.addEventListener('click', () => {
        const heightmapData = generateHeightmapData();
        const blob = new Blob([heightmapData], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'heightmap.r16';
        link.click();
    });

    generateBtn.addEventListener('click', generateAndRenderPlanet);
    randomizeSeedBtn.addEventListener('click', () => {
        randomizeSeed();
        generateAndRenderPlanet();
    });

    function initThree() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.z = 1.5;

        canvas.width = 500;
        canvas.height = 500;
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(canvas.width, canvas.height);
        renderer.setClearColor( 0x000000, 0 );

        // Planet Sphere
        const planetGeometry = new THREE.SphereGeometry(0.5, 64, 64);
        const planetMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        planetSphere = new THREE.Mesh(planetGeometry, planetMaterial);
        scene.add(planetSphere);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        animate();
    }

    function generateHeightmapData() {
        const seed = parseInt(seedInput.value);
        const noise = new Noise(seed);

        const terrainRoughness = parseFloat(terrainRoughnessSlider.value);
        const terrainDetail = parseInt(terrainDetailSlider.value);
        const mountainPeaks = parseFloat(mountainPeaksSlider.value);

        const width = 1009;
        const height = 1009;
        const data = new Uint16Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const u = x / width;
                const v = y / height;

                const theta = v * Math.PI;
                const phi = u * 2 * Math.PI;

                const px = -Math.cos(phi) * Math.sin(theta);
                const py = Math.cos(theta);
                const pz = Math.sin(phi) * Math.sin(theta);

                let e = 0;
                let frequency = terrainRoughness * 8;
                let amplitude = 1;
                for (let i = 0; i < terrainDetail; i++) {
                    e += amplitude * noise.simplex3(frequency * px, frequency * py, frequency * pz);
                    frequency *= 2;
                    amplitude *= 0.5;
                }

                e = (1 + e) / 2; // Normalize to 0-1
                e = Math.pow(e, mountainPeaks);

                data[y * width + x] = Math.floor(e * 65535);
            }
        }
        return data;
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    // Initial generation
    if (!parseUrlHash()) {
        randomizeSeed();
    }
    generateAndRenderPlanet();
});