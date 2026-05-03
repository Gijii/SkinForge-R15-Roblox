/**
 * ============================================================================
 * ROBLOX CRAFTER PRO - 3D GHOST GUIDE (script.js)
 * Motor 3D con Three.js, texturizado dinámico y guías invisibles al exportar.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES ---
    let scene, camera, renderer, model, controls, texture;
    const container = document.getElementById('container3D');
    const canvas2D = document.getElementById('canvasRoblox');
    const ctx2D = canvas2D.getContext('2d', { willReadFrequently: true });
    
    // --- ELEMENTOS DE LA UI ---
    const adjustmentsPanel = document.getElementById('adjustmentsPanel');
    const inputImagen = document.getElementById('subirImagen');
    const btnAddLayer = document.getElementById('btnAddLayer');
    const layersList = document.getElementById('layersList');
    const btnDescargar = document.getElementById('btnDescargar');
    const btnReset = document.getElementById('btnReset');

    // --- ESTADO DEL PROYECTO ---
    let layers = []; 
    let selectedLayerIndex = -1;
    const plantillaImg = new Image();
    plantillaImg.src = 'plantilla.png'; // Asegúrate de que el nombre sea exacto en GitHub

    // --- INICIALIZACIÓN ---
    function init() {
        init3D(); // Iniciamos el motor 3D de inmediato
        setupEventListeners();
        
        // Cuando la plantilla cargue, actualizamos la textura
        plantillaImg.onload = () => {
            console.log("Plantilla cargada correctamente");
            actualizarTextura3D();
        };
        plantillaImg.onerror = () => {
            console.warn("No se encontró plantilla.png, pero el editor seguirá funcionando.");
        };
    }

    // --- MOTOR 3D ---
    function init3D() {
        // 1. Escena y Cámara
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 8); // Posición inicial de la cámara

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
        controls.maxDistance = 15;
        controls.target.set(0, 0, 0);

        // 4. Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight2.position.set(-5, -10, -7);
        scene.add(dirLight2);

        // 5. Textura Dinámica Inicial
        renderCanvas2D(true); // Encendemos las guías por defecto
        texture = new THREE.CanvasTexture(canvas2D);
        texture.flipY = false; // Ajuste crucial para las coordenadas UV de blocky-r15.obj
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

        // 6. Cargar el Modelo .OBJ
        const loader = new THREE.OBJLoader();
        loader.load('blocky-r15.obj', (obj) => {
            model = obj;
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        transparent: true,
                        roughness: 0.7,
                        metalness: 0.1
                    });
                }
            });
            
            // Centrar y escalar el modelo
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.y = -center.y - 1; // Bajamos un poco el centro de gravedad
            model.position.z = -center.z;
            
            const group = new THREE.Group();
            group.add(model);
            group.scale.set(1.8, 1.8, 1.8);
            scene.add(group);
        }, undefined, (error) => {
            console.error('Error cargando el OBJ:', error);
        });

        animate();
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    // --- LÓGICA DE DIBUJO (MÁSCARAS Y GUÍAS) ---
    function renderCanvas2D(mostrarGuias = true) {
        // Limpiamos el lienzo completamente
        ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);
        
        // 1. Dibujar todas las capas del usuario
        ctx2D.globalCompositeOperation = 'source-over';
        layers.forEach(layer => {
            if (!layer.visible) return;
            const scale = layer.scale / 100;
            const w = canvas2D.width * scale;
            const h = canvas2D.height * scale;
            const x = (canvas2D.width - w) / 2 + layer.posX;
            const y = (canvas2D.height - h) / 2 + layer.posY;
            ctx2D.drawImage(layer.img, x, y, w, h);
        });

        // 2. Dibujar guías SOLO si se solicita (para el 3D)
        if (mostrarGuias && plantillaImg.complete && plantillaImg.naturalWidth !== 0) {
            // 'multiply' mezcla las líneas negras sin pintar el fondo blanco
            ctx2D.globalCompositeOperation = 'multiply';
            ctx2D.drawImage(plantillaImg, 0, 0, 585, 559);
        }

        // Restaurar modo normal
        ctx2D.globalCompositeOperation = 'source-over';
    }

    function actualizarTextura3D() {
        renderCanvas2D(true); // En la pantalla 3D siempre queremos ver las guías
        if (texture) texture.needsUpdate = true; // Refresca el modelo
    }

    // --- MANEJO DE EVENTOS (BOTONES, SLIDERS, ETC) ---
    function setupEventListeners() {
        // Botón principal y Dropzone
        btnAddLayer.addEventListener('click', () => inputImagen.click());
        
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => e.preventDefault());
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length > 0) procesarNuevaCapa(e.dataTransfer.files[0]);
            });
        }

        // Seleccionar imagen desde explorador
        inputImagen.addEventListener('change', (e) => {
            if (e.target.files.length > 0) procesarNuevaCapa(e.target.files[0]);
        });

        // Controles de ajuste (Escala y Posición)
        ['scaleS', 'xS', 'yS'].forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    if (selectedLayerIndex !== -1 && layers[selectedLayerIndex]) {
                        const layer = layers[selectedLayerIndex];
                        if (id === 'scaleS') layer.scale = parseInt(e.target.value);
                        if (id === 'xS') layer.posX = parseInt(e.target.value);
                        if (id === 'yS') layer.posY = parseInt(e.target.value);
                        actualizarLabelsAjuste(layer);
                        actualizarTextura3D();
                    }
                });
            }
        });

        // Botón de Descarga
        if (btnDescargar) {
            btnDescargar.addEventListener('click', () => {
                if (layers.length === 0) return alert("Agrega al menos una textura antes de descargar.");
                
                // 1. Apagamos las guías para que no salgan en la descarga
                renderCanvas2D(false); 
                
                // 2. Forzamos la descarga del canvas limpio
                const a = document.createElement('a');
                a.download = "Ropa_Roblox_Pro_Limpia.png";
                a.href = canvas2D.toDataURL('image/png');
                a.click();
                
                // 3. Volvemos a encender las guías para seguir editando
                actualizarTextura3D();
            });
        }

        // Botón de Reiniciar
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if(confirm("¿Seguro que quieres borrar todo?")) location.reload();
            });
        }

        // Responsive 3D Canvas
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }

    // --- GESTIÓN DE CAPAS E INTERFAZ ---
    function procesarNuevaCapa(file) {
        if (!file || !file.type.startsWith('image/')) return alert("Por favor sube una imagen válida (PNG o JPG).");
        
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
                if (adjustmentsPanel) adjustmentsPanel.classList.remove('hidden');
                actualizarInterfazCapas();
                sincronizarSliders(layers[selectedLayerIndex]);
                actualizarTextura3D();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        inputImagen.value = ''; // Resetea el input para poder subir la misma imagen dos veces si se desea
    }

    function actualizarInterfazCapas() {
        if (!layersList) return;
        layersList.innerHTML = '';
        
        // Bucle invertido para que la última capa subida salga arriba en la lista
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            const li = document.createElement('li');
            li.className = `layer-item ${i === selectedLayerIndex ? 'active' : ''}`;
            
            // Botones de la capa (Ojo y Papelera)
            li.innerHTML = `
                <span>${layer.name}</span>
                <div class="layer-btns">
                    <button onclick="event.stopPropagation(); window.toggleLayer(${i});">${layer.visible ? '👁️' : '🕶️'}</button>
                    <button onclick="event.stopPropagation(); window.deleteLayer(${i});">🗑️</button>
                </div>
            `;
            
            li.onclick = () => { 
                selectedLayerIndex = i; 
                sincronizarSliders(layer); 
                actualizarInterfazCapas(); 
            };
            layersList.appendChild(li);
        }
    }

    // Funciones globales para que el HTML pueda llamarlas desde el onclick
    window.toggleLayer = function(index) {
        layers[index].visible = !layers[index].visible;
        actualizarInterfazCapas();
        actualizarTextura3D();
    };

    window.deleteLayer = function(index) {
        layers.splice(index, 1);
        selectedLayerIndex = layers.length > 0 ? layers.length - 1 : -1;
        if (selectedLayerIndex === -1 && adjustmentsPanel) {
            adjustmentsPanel.classList.add('hidden');
        } else if (selectedLayerIndex !== -1) {
            sincronizarSliders(layers[selectedLayerIndex]);
        }
        actualizarInterfazCapas();
        actualizarTextura3D();
    };

    function sincronizarSliders(l) {
        if(!l) return;
        const sS = document.getElementById('scaleS');
        const xS = document.getElementById('xS');
        const yS = document.getElementById('yS');
        
        if (sS) sS.value = l.scale;
        if (xS) xS.value = l.posX;
        if (yS) yS.value = l.posY;
        actualizarLabelsAjuste(l);
    }

    function actualizarLabelsAjuste(l) {
        const sV = document.getElementById('scaleV');
        const xV = document.getElementById('xV');
        const yV = document.getElementById('yV');
        
        if (sV) sV.textContent = `${l.scale}%`;
        if (xV) xV.textContent = l.posX;
        if (yV) yV.textContent = l.posY;
    }

    // Ejecutar programa
    init();
});
