/**
 * ============================================================================
 * ROBLOX CRAFTER PRO - 3D ENGINE (script.js)
 * Motor 3D con Three.js y texturizado en tiempo real sobre blocky-r15.obj
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES 3D Y 2D ---
    let scene, camera, renderer, model, controls, texture;
    const container = document.getElementById('container3D');
    const canvas2D = document.getElementById('canvasRoblox');
    const ctx2D = canvas2D.getContext('2d', { willReadFrequently: true });
    
    // --- UI ELEMENTS ---
    const adjustmentsPanel = document.getElementById('adjustmentsPanel');
    const inputImagen = document.getElementById('subirImagen');
    const btnAddLayer = document.getElementById('btnAddLayer');
    const layersList = document.getElementById('layersList');
    const btnDescargar = document.getElementById('btnDescargar');
    const btnReset = document.getElementById('btnReset');

    // --- ESTADO ---
    let layers = []; 
    let selectedLayerIndex = -1;
    const plantillaImg = new Image();
    plantillaImg.src = 'plantilla.png';

    // --- INICIALIZACIÓN ---
    function init() {
        plantillaImg.onload = () => {
            init3D();
            setupEventListeners();
        };
    }

    function init3D() {
        // 1. Escena y Cámara
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 6);

        // 2. Renderizador WebGL
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // 3. Controles orbitales (Mouse)
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 10;
        controls.target.set(0, 0, 0);

        // 4. Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight2.position.set(-5, -10, -7);
        scene.add(dirLight2);

        // 5. Textura Dinámica Inicial
        renderCanvas2D();
        texture = new THREE.CanvasTexture(canvas2D);
        texture.flipY = false; // ROBX UV FIX
        texture.minFilter = THREE.NearestFilter; // Evita bordes borrosos
        texture.magFilter = THREE.NearestFilter;

        // 6. Cargar el OBJ
        const loader = new THREE.OBJLoader();
        loader.load('blocky-r15.obj', (obj) => {
            model = obj;
            // Ajustar el material de todas las piezas del modelo
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        transparent: true,
                        alphaTest: 0.1,
                        roughness: 0.8,
                        metalness: 0.1
                    });
                }
            });
            
            // Centrar y escalar modelo en pantalla
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;
            
            const group = new THREE.Group();
            group.add(model);
            group.scale.set(1.5, 1.5, 1.5);
            scene.add(group);
        }, undefined, (error) => {
            console.error('Error cargando el OBJ:', error);
        });

        // Loop de animación
        animate();
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    // --- LÓGICA DE CAPAS Y 2D ---
    function renderCanvas2D() {
        ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);
        
        // Máscara inversa: Dibujamos la plantilla (con huecos transparentes)
        ctx2D.globalCompositeOperation = 'source-over';
        ctx2D.drawImage(plantillaImg, 0, 0, 585, 559);

        // Insertar imágenes dentro de la plantilla
        ctx2D.globalCompositeOperation = 'source-in';

        layers.forEach(layer => {
            if (!layer.visible) return;
            const scale = layer.scale / 100;
            const w = canvas2D.width * scale;
            const h = canvas2D.height * scale;
            const x = (canvas2D.width - w) / 2 + layer.posX;
            const y = (canvas2D.height - h) / 2 + layer.posY;
            ctx2D.drawImage(layer.img, x, y, w, h);
        });

        ctx2D.globalCompositeOperation = 'source-over';
    }

    function actualizarTextura3D() {
        renderCanvas2D();
        if (texture) {
            texture.needsUpdate = true; // Avisa a Three.js que actualice el 3D
        }
    }

    function setupEventListeners() {
        btnAddLayer.addEventListener('click', () => inputImagen.click());
        
        const dropZone = document.getElementById('uploadSection');
        dropZone.addEventListener('dragover', (e) => e.preventDefault());
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) procesarNuevaCapa(e.dataTransfer.files[0]);
        });

        inputImagen.addEventListener('change', (e) => {
            if (e.target.files.length > 0) procesarNuevaCapa(e.target.files[0]);
        });

        ['scaleS', 'xS', 'yS'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                if (selectedLayerIndex !== -1 && layers[selectedLayerIndex]) {
                    const layer = layers[selectedLayerIndex];
                    if (id === 'scaleS') layer.scale = parseInt(e.target.value);
                    if (id === 'xS') layer.posX = parseInt(e.target.value);
                    if (id === 'yS') layer.posY = parseInt(e.target.value);
                    actualizarLabelsAjuste(layer);
                    actualizarTextura3D();
                }
            });
        });

        btnDescargar.addEventListener('click', descargarPlantilla);
        btnReset.addEventListener('click', () => location.reload());

        // Adaptar 3D al cambiar tamaño de ventana
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }

    function procesarNuevaCapa(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                layers.push({
                    img: img,
                    name: file.name.substring(0, 15),
                    visible: true,
                    scale: 100,
                    posX: 0,
                    posY: 0
                });
                selectedLayerIndex = layers.length - 1;
                adjustmentsPanel.classList.remove('hidden');
                actualizarInterfazCapas();
                sincronizarSliders(layers[selectedLayerIndex]);
                actualizarTextura3D();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        inputImagen.value = '';
    }

    function actualizarInterfazCapas() {
        layersList.innerHTML = '';
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            const li = document.createElement('li');
            li.className = `layer-item ${i === selectedLayerIndex ? 'active' : ''}`;
            li.innerHTML = `<span>${layer.name}</span><div class="layer-btns">
                <button onclick="event.stopPropagation(); layers[${i}].visible = !layers[${i}].visible; actualizarInterfazCapas(); actualizarTextura3D();">${layer.visible ? '👁️' : '🕶️'}</button>
                <button onclick="event.stopPropagation(); layers.splice(${i}, 1); selectedLayerIndex = layers.length > 0 ? layers.length - 1 : -1; if(selectedLayerIndex === -1) document.getElementById('adjustmentsPanel').classList.add('hidden'); actualizarInterfazCapas(); actualizarTextura3D();">🗑️</button></div>`;
            li.onclick = () => { selectedLayerIndex = i; sincronizarSliders(layer); actualizarInterfazCapas(); };
            layersList.appendChild(li);
        }
    }

    window.sincronizarSliders = function(l) {
        if(!l) return;
        document.getElementById('scaleS').value = l.scale;
        document.getElementById('xS').value = l.posX;
        document.getElementById('yS').value = l.posY;
        actualizarLabelsAjuste(l);
    }

    window.actualizarLabelsAjuste = function(l) {
        document.getElementById('scaleV').textContent = `${l.scale}%`;
        document.getElementById('xV').textContent = l.posX;
        document.getElementById('yV').textContent = l.posY;
    }

    function descargarPlantilla() {
        if (layers.length === 0) return;
        
        // Asegurarnos de que el canvas tiene la textura final generada
        renderCanvas2D();
        
        const a = document.createElement('a');
        a.download = "Ropa_Roblox_3D_Pro.png";
        a.href = canvas2D.toDataURL('image/png');
        a.click();
    }

    // --- EJECUCIÓN ---
    init();
});