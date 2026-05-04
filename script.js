document.addEventListener('DOMContentLoaded', () => {
    let scene, camera, renderer, model, controls, texture;
    const container = document.getElementById('container3D');
    const canvas2D = document.getElementById('canvasRoblox');
    const ctx2D = canvas2D.getContext('2d', { willReadFrequently: true });
    
    const adjustmentsPanel = document.getElementById('adjustmentsPanel');
    const inputImagen = document.getElementById('subirImagen');
    const btnAddLayer = document.getElementById('btnAddLayer');
    const btnCamisa = document.getElementById('btnCamisa');
    const btnPantalon = document.getElementById('btnPantalon');
    const layersList = document.getElementById('layersList');
    const btnDescargar = document.getElementById('btnDescargar');
    const btnReset = document.getElementById('btnReset');

    let layers = []; 
    let selectedLayerIndex = -1;
    window.tipoPrenda = 'Capa'; 

    const ROBLOX_UV_MAP = {
        TORSO_FRONT: { x: 232, y: 74, w: 128, h: 128 },
        RIGHT_LEG_FRONT: { x: 73, y: 285, w: 64, h: 128 },
        LEFT_LEG_FRONT: { x: 393, y: 285, w: 64, h: 128 }
    };

    function init() {
        canvas2D.width = 585;
        canvas2D.height = 559;
        init3D(); 
        setupEventListeners();
        actualizarTextura3D(); 
    }

    function animate() {
        requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    }

    function init3D() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color('#181a1f'); 

        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 8);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1; 
        container.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 15;
        controls.target.set(0, 0, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2); 
        keyLight.position.set(5, 10, 7);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0x88bbff, 0.6); 
        fillLight.position.set(-5, 0, -5);
        scene.add(fillLight);
        const backLight = new THREE.DirectionalLight(0xffffff, 0.4); 
        backLight.position.set(0, 10, -10);
        scene.add(backLight);

        renderCanvas2D('3D'); 
        texture = new THREE.CanvasTexture(canvas2D);
        texture.flipY = false; 
        texture.minFilter = THREE.LinearFilter; 
        texture.magFilter = THREE.LinearFilter;

        const loader = new THREE.OBJLoader();
        loader.load('blocky-r15.obj', (obj) => { 
            model = obj;
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        roughness: 0.85,  
                        metalness: 0.05,  
                        envMapIntensity: 1.0 
                    });
                }
            });
            
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.y = -center.y - 1; 
            model.position.z = -center.z;
            
            const group = new THREE.Group();
            group.add(model);
            group.scale.set(1.8, 1.8, 1.8);
            scene.add(group);
        });

        animate();
    }

    function renderCanvas2D(modo = '3D') {
        ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);
        
        if (modo === '3D') {
            ctx2D.fillStyle = '#e2b99a'; 
            ctx2D.fillRect(0, 0, canvas2D.width, canvas2D.height);
        }

        ctx2D.globalCompositeOperation = 'source-over';
        layers.forEach(layer => {
            if (!layer.visible) return;
            
            const scale = layer.scale / 100;
            const w = layer.img.naturalWidth * scale;
            const h = layer.img.naturalHeight * scale;
            
            ctx2D.drawImage(layer.img, layer.posX, layer.posY, w, h);
        });
    }

    function actualizarTextura3D() {
        renderCanvas2D('3D'); 
        if (texture) texture.needsUpdate = true; 
    }

    function setupEventListeners() {
        if (btnCamisa) {
            btnCamisa.addEventListener('click', () => {
                window.tipoPrenda = 'Camisa';
                inputImagen.click();
            });
        }

        if (btnPantalon) {
            btnPantalon.addEventListener('click', () => {
                window.tipoPrenda = 'Pantalon';
                inputImagen.click();
            });
        }

        if (btnAddLayer) {
            btnAddLayer.addEventListener('click', () => {
                window.tipoPrenda = 'Capa';
                inputImagen.click();
            });
        }
        
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => e.preventDefault());
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length > 0) {
                    window.tipoPrenda = 'Capa';
                    procesarNuevaCapa(e.dataTransfer.files[0]);
                }
            });
        }

        inputImagen.addEventListener('change', (e) => {
            if (e.target.files.length > 0) procesarNuevaCapa(e.target.files[0]);
        });

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

        if (btnDescargar) {
            btnDescargar.addEventListener('click', () => {
                if (layers.length === 0) return alert("Agrega al menos una textura antes de descargar.");
                
                renderCanvas2D('descarga'); 
                
                const a = document.createElement('a');
                a.download = "Ropa_Roblox_Transparente.png";
                a.href = canvas2D.toDataURL('image/png');
                a.click();
                
                actualizarTextura3D(); 
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if(confirm("¿Seguro que quieres borrar todo?")) location.reload();
            });
        }

        window.addEventListener('resize', () => {
            if (camera && renderer && container) {
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            }
        });
    }

    function procesarNuevaCapa(file) {
        if (!file || !file.type.startsWith('image/')) return alert("Sube una imagen válida (PNG o JPG).");
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let posXInicial = 0;
                let posYInicial = 0;
                let escalaInicial = 100;

                if (img.naturalWidth !== 585 || img.naturalHeight !== 559) {
                    if (window.tipoPrenda === 'Camisa') {
                        posXInicial = ROBLOX_UV_MAP.TORSO_FRONT.x + (ROBLOX_UV_MAP.TORSO_FRONT.w / 2) - (img.naturalWidth / 2);
                        posYInicial = ROBLOX_UV_MAP.TORSO_FRONT.y + (ROBLOX_UV_MAP.TORSO_FRONT.h / 2) - (img.naturalHeight / 2);
                    } else if (window.tipoPrenda === 'Pantalon') {
                        posXInicial = ROBLOX_UV_MAP.RIGHT_LEG_FRONT.x + (ROBLOX_UV_MAP.RIGHT_LEG_FRONT.w / 2) - (img.naturalWidth / 2);
                        posYInicial = ROBLOX_UV_MAP.RIGHT_LEG_FRONT.y + (ROBLOX_UV_MAP.RIGHT_LEG_FRONT.h / 2) - (img.naturalHeight / 2);
                    }
                }

                layers.push({
                    img: img,
                    name: `${window.tipoPrenda} - ${file.name.substring(0, 10)}`,
                    visible: true, 
                    scale: escalaInicial, 
                    posX: posXInicial, 
                    posY: posYInicial
                });
                
                selectedLayerIndex = layers.length - 1;
                if (adjustmentsPanel) adjustmentsPanel.classList.remove('hidden');
                actualizarInterfazCapas();
                sincronizarSliders(layers[selectedLayerIndex]);
                actualizarTextura3D();
                
                window.tipoPrenda = 'Capa'; 
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        inputImagen.value = ''; 
    }

    function actualizarInterfazCapas() {
        if (!layersList) return;
        layersList.innerHTML = '';
        
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            const li = document.createElement('li');
            li.className = `layer-item ${i === selectedLayerIndex ? 'active' : ''}`;
            
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
        if (xV) xV.textContent = Math.round(l.posX);
        if (yV) yV.textContent = Math.round(l.posY);
    }

    init();
});
