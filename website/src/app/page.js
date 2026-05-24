"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export default function Home() {
  const containerRef = useRef(null);
  const textureRef = useRef(null);

  // Background state and options
  const [bgType, setBgType] = useState('black');
  const bgGradients = {
    black: 'linear-gradient(135deg, #121212 0%, #1c1c1c 100%)',
    green: 'linear-gradient(135deg, #0d381e 0%, #03140a 100%)',
    pink: 'linear-gradient(135deg, #421025 0%, #17030d 100%)',
    red: 'linear-gradient(135deg, #400a0a 0%, #140202 100%)',
    blue: 'linear-gradient(135deg, #0a1c40 0%, #020917 100%)'
  };

  // Control panel states
  const [zoomY, setZoomY] = useState(1.35);
  const [zoomX, setZoomX] = useState(3.60);
  const [offsetY, setOffsetY] = useState(-0.075);
  const [offsetX, setOffsetX] = useState(-1.30);
  const [lockAspect, setLockAspect] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  // Refs for real-time slider interaction within Three.js loop
  const zoomYRef = useRef(1.35);
  const zoomXRef = useRef(3.60);
  const offsetYRef = useRef(-0.075);
  const offsetXRef = useRef(-1.30);
  const lockAspectRef = useRef(true);

  // Apply custom background gradient dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.background = bgGradients[bgType];
    }
  }, [bgType]);

  // Sync state changes with the refs and direct Three.js texture properties
  useEffect(() => {
    zoomYRef.current = zoomY;
    zoomXRef.current = zoomX;
    offsetYRef.current = offsetY;
    offsetXRef.current = offsetX;
    lockAspectRef.current = lockAspect;

    if (textureRef.current) {
      textureRef.current.repeat.set(zoomX, zoomY);
      textureRef.current.offset.set(offsetX, offsetY);
    }
  }, [zoomY, zoomX, offsetY, offsetX, lockAspect]);

  const handleZoomYChange = (val) => {
    setZoomY(val);
    if (lockAspect) {
      // Auto-calculate horizontal mapping based on spherical projection aspect ratio correction (2.6667)
      const rx = parseFloat((val * 2.6667).toFixed(2));
      setZoomX(rx);
      // Auto-center horizontal offset based on repeat.x
      const ox = parseFloat((0.5 * (1 - rx)).toFixed(3));
      setOffsetX(ox);
    }
  };

  const handleCopyCode = () => {
    const text = `jabirTexture.repeat.set(${zoomX.toFixed(2)}, ${zoomY.toFixed(2)});\njabirTexture.offset.set(${offsetX.toFixed(3)}, ${offsetY.toFixed(3)});`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. SETUP THREE.JS ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 45);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0); // Transparent canvas so global gradient shows through
    container.appendChild(renderer.domElement);

    // --- POST-PROCESSING ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85);
    const outputPass = new OutputPass();

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    // --- 2. SETUP CANNON-ES PHYSICS ---
    const world = new CANNON.World();
    world.gravity.set(0, 0, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 0;
    world.solver.tolerance = 0.001;

    // --- 3. LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.5);
    fillLight.position.set(-10, 0, 5);
    scene.add(fillLight);

    // --- 4. LOAD JABIR PORTRAIT TEXTURE ---
    const textureLoader = new THREE.TextureLoader();
    const jabirTexture = textureLoader.load('/jabir.jpeg', () => {
      const loadingScreen = document.getElementById('loading');
      if (loadingScreen) loadingScreen.style.opacity = '0';
    });
    jabirTexture.colorSpace = THREE.SRGBColorSpace;
    jabirTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    jabirTexture.wrapS = THREE.RepeatWrapping;
    jabirTexture.wrapT = THREE.RepeatWrapping;

    // Apply current tuning params
    jabirTexture.repeat.set(zoomXRef.current, zoomYRef.current);
    jabirTexture.offset.set(offsetXRef.current, offsetYRef.current);
    textureRef.current = jabirTexture;

    // --- 5. THE BALLS (Sizes, Materials, Physics) ---
    const pills = [];

    const geomNormal = new THREE.SphereGeometry(1.0, 32, 32);
    geomNormal.rotateY(Math.PI);

    const geomSmall = new THREE.SphereGeometry(0.68, 32, 32);
    geomSmall.rotateY(Math.PI);

    const shapeNormal = new CANNON.Sphere(0.85);
    const shapeSmall = new CANNON.Sphere(0.55);

    const sphereMaterial = new THREE.MeshPhysicalMaterial({
      map: jabirTexture,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      emissive: 0xFFE600,
      emissiveMap: jabirTexture,
      emissiveIntensity: 0.0
    });

    const baseMaterials = [sphereMaterial];
    const physicsMaterial = new CANNON.Material('pill');
    const pillContactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
      friction: 0.0,
      restitution: 0.0,
      contactEquationStiffness: 1e6,
      contactEquationRelaxation: 4
    });
    world.addContactMaterial(pillContactMaterial);

    function createPill(x, y, z, isSmall = false) {
      const baseMat = baseMaterials[Math.floor(Math.random() * baseMaterials.length)];
      const uniqueMaterial = baseMat.clone();

      const geometry = isSmall ? geomSmall : geomNormal;
      const mesh = new THREE.Mesh(geometry, uniqueMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const shape = isSmall ? shapeSmall : shapeNormal;
      const body = new CANNON.Body({
        mass: isSmall ? 1.0 : 2.0,
        material: physicsMaterial,
        shape: shape,
        position: new CANNON.Vec3(x, y, z),
        linearDamping: 0.85,
        angularDamping: 0.85,
        collisionResponse: false
      });
      body.collisionFilterGroup = 0;
      body.collisionFilterMask = 0;
      body.quaternion.set(0, 0, 0, 1);

      world.addBody(body);
      pills.push({ mesh, body, initialPosition: new THREE.Vector3(x, y, z) });
    }

    // Generate responsive grid
    function generateDenseGrid() {
      const xSpacing = 1.8;
      const ySpacing = 1.6;

      // MOBILE DISPLAY OPTIMIZATION: Reduce grid size dynamically to prevent lag on mobile GPUs
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const cols = isMobile ? 18 : 42;
      const rows = isMobile ? 28 : 60;
      const startX = -((cols - 1) * xSpacing) / 2;
      const startY = -((rows - 1) * ySpacing) / 2;

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const isSmall = Math.random() < 0.25;
          const xOffset = (j % 2 === 0) ? 0 : (xSpacing / 2);

          const x = startX + i * xSpacing + xOffset + (Math.random() - 0.5) * 0.4;
          const y = startY + j * ySpacing + (Math.random() - 0.5) * 0.4;
          const z = (Math.random() - 0.5) * 10.0;

          createPill(x, y, z, isSmall);
        }
      }
    }
    generateDenseGrid();

    // --- 6. BOUNDARIES ---
    const wallMaterial = new CANNON.Material('wall');
    const wallContactMaterial = new CANNON.ContactMaterial(physicsMaterial, wallMaterial, {
      friction: 0.0, restitution: 0.0
    });
    world.addContactMaterial(wallContactMaterial);

    function createWall(x, y, z, rotX, rotY, rotZ) {
      const shape = new CANNON.Plane();
      const body = new CANNON.Body({ mass: 0, material: wallMaterial });
      body.addShape(shape);
      body.position.set(x, y, z);
      body.quaternion.setFromEuler(rotX, rotY, rotZ);
      world.addBody(body);
    }

    createWall(0, -60, 0, -Math.PI / 2, 0, 0); // Floor
    createWall(-60, 0, 0, 0, Math.PI / 2, 0);  // Left Wall
    createWall(60, 0, 0, 0, -Math.PI / 2, 0);  // Right Wall
    createWall(0, 60, 0, Math.PI / 2, 0, 0);   // Ceiling
    createWall(0, 0, -25.0, 0, 0, 0);          // Back Glass
    createWall(0, 0, 25.0, 0, Math.PI, 0);     // Front Glass

    // --- 7. MOUSE INTERACTION ---
    const mousePos3D = new THREE.Vector3(0, -100, 0);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const customCursor = document.getElementById('custom-cursor');
    let isMouseActive = false;
    let lastMouseMoveTime = 0;

    // --- AUDIO SETUP ---
    const audio = new Audio('/jabir2.mp3');
    audio.loop = true;
    audio.volume = 0.7;
    let isAudioUnlocked = false;

    const unlockAudio = () => {
      if (isAudioUnlocked) return;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        isAudioUnlocked = true;
        cleanupListeners();
      }).catch(err => {
        console.log("Waiting for user interaction to unlock audio:", err);
      });
    };

    const cleanupListeners = () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('mousemove', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('mousemove', unlockAudio);

    const onMouseMove = (e) => {
      isMouseActive = true;
      lastMouseMoveTime = performance.now();
      if (customCursor) {
        customCursor.style.left = e.clientX + 'px';
        customCursor.style.top = e.clientY + 'px';
      }

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeZ, intersectPoint);

      mousePos3D.copy(intersectPoint);
    };

    const onMouseOut = () => {
      isMouseActive = false;
      mousePos3D.set(0, -100, 0);
    };

    const onTouchMove = (e) => {
      isMouseActive = true;
      lastMouseMoveTime = performance.now();
      const touch = e.touches[0];
      if (customCursor) {
        customCursor.style.left = touch.clientX + 'px';
        customCursor.style.top = touch.clientY + 'px';
      }

      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeZ, intersectPoint);
      mousePos3D.copy(intersectPoint);
    };

    const onTouchEnd = () => {
      isMouseActive = false;
      mousePos3D.set(0, -100, 0);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseout', onMouseOut);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // --- 8. RESIZE HANDLER ---
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // --- 9. ANIMATION LOOP ---
    const clock = new THREE.Clock();
    const targetPos = new CANNON.Vec3();
    const maxVel = 20.0;
    let animationFrameId;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);
      world.step(1 / 60, delta, 3);

      let anyPillUnderCursor = false;

      pills.forEach(pill => {
        // --- 1. CALCULATE SOFT TARGET POSITION (With continuous idle floating) ---
        targetPos.copy(pill.initialPosition);

        const time = clock.getElapsedTime();
        const uniqueOffset = (pill.initialPosition.x * 0.4) + (pill.initialPosition.y * 0.6) + (pill.initialPosition.z * 0.2);
        const idleSpeed = 1.2;
        const idleAmp = 0.25;

        targetPos.x += Math.sin(time * idleSpeed + uniqueOffset) * idleAmp;
        targetPos.y += Math.cos(time * idleSpeed * 0.85 + uniqueOffset) * idleAmp;
        targetPos.z += Math.sin(time * idleSpeed * 1.3 + uniqueOffset) * (idleAmp * 0.4);

        // Calculate distance from mouse to initialPosition (home)
        const distToMouse = pill.initialPosition.distanceTo(mousePos3D);
        const pushRadius = 7.5; // Radius of transparent interaction sphere

        if (isMouseActive && distToMouse < pushRadius) {
          const intensity = Math.pow(1.0 - (distToMouse / pushRadius), 2);

          // 3D displacement vector
          let dirX = pill.initialPosition.x - mousePos3D.x;
          let dirY = pill.initialPosition.y - mousePos3D.y;
          let dirZ = pill.initialPosition.z - mousePos3D.z;
          let len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

          if (len > 0.001) {
            dirX /= len;
            dirY /= len;
            dirZ /= len;
          } else {
            dirX = 0;
            dirY = 1;
            dirZ = 0;
          }

          // Push targets out to sphere edge
          const maxPush = pushRadius - distToMouse;
          targetPos.x += dirX * maxPush * 1.1;
          targetPos.y += dirY * maxPush * 1.1;
          targetPos.z += dirZ * maxPush * 0.8 + (intensity * 3.5);
        }

        // --- 2. ULTRA-CALM SNAPPY/GLIDE VELOCITY CONTROL ---
        const isUnderCursor = isMouseActive && distToMouse < pushRadius;
        const speedFactor = isUnderCursor ? 35.0 : 8.5;

        pill.body.velocity.set(
          (targetPos.x - pill.body.position.x) * speedFactor,
          (targetPos.y - pill.body.position.y) * speedFactor,
          (targetPos.z - pill.body.position.z) * speedFactor
        );

        // --- 3. ROTATION LOCK ---
        // Emojis are locked to face perfectly straight toward the camera (no angular sway)
        pill.body.angularVelocity.set(0, 0, 0);

        // --- 4. SAFETY CLAMP ---
        const speedSq = pill.body.velocity.lengthSquared();
        if (speedSq > maxVel * maxVel) {
          pill.body.velocity.scale(maxVel / Math.sqrt(speedSq), pill.body.velocity);
        }

        // --- 5. DYNAMIC NEON PROXIMITY EFFECT (Immediate Reaction) ---
        let targetEmissive = 0.0;
        let targetRoughness = 0.18;

        if (isUnderCursor) {
          const intensity = 1.0 - (distToMouse / pushRadius);
          targetEmissive = intensity * 1.6; // Glowing golden neon pop
          targetRoughness = 0.05;
          anyPillUnderCursor = true;
        }

        const mat = pill.mesh.material;
        // High-performance state-check optimization
        if (mat.emissiveIntensity !== targetEmissive) {
          mat.emissiveIntensity = targetEmissive;
          mat.roughness = targetRoughness;
        }

        // --- 6. SYNC VISUALS ---
        pill.mesh.position.copy(pill.body.position);
        pill.mesh.quaternion.copy(pill.body.quaternion);
      });

      // --- AUDIO PLAYBACK CONTROL ---
      const isMouseMoving = (performance.now() - lastMouseMoveTime) < 100;
      const shouldPlay = isMouseActive && isMouseMoving && anyPillUnderCursor;

      if (shouldPlay && isAudioUnlocked) {
        if (audio.paused) {
          audio.play().catch(err => console.log("Audio play failed:", err));
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }

      composer.render();
    }

    animate();

    // CLEANUP FUNCTIONS TO PREVENT MEMORY LEAKS
    return () => {
      cancelAnimationFrame(animationFrameId);
      cleanupListeners();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);

      // Stop and clean up audio
      audio.pause();
      audio.src = '';

      // Clean up geometries and materials
      geomNormal.dispose();
      geomSmall.dispose();
      sphereMaterial.dispose();
      pills.forEach(p => {
        p.mesh.material.dispose();
        scene.remove(p.mesh);
      });
      jabirTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <div id="loading">LOADING JABIR BALLS...</div>
      <div id="custom-cursor"></div>

      {/* Dynamic 3D Container */}
      <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }} />

      {/* Toggle control panel button */}
      {!panelVisible && (
        <button
          className="toggle-panel-btn"
          onClick={() => setPanelVisible(true)}
          title="Toggle Texture Tuning Panel"
          style={{ display: 'flex' }}
        >
          ⚙️
        </button>
      )}

      {/* Texture Tuning Panel */}
      {panelVisible && (
        <div className="control-panel" style={{ display: 'block' }}>
          <h3>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Texture Tuning</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.7, fontWeight: 'normal', marginTop: '2px' }}>
                (Center Jabir Face)
              </span>
            </span>
            <button
              className="close-panel-btn"
              onClick={() => setPanelVisible(false)}
              title="Hide Texture Tuning Panel"
            >
              ×
            </button>
          </h3>

          {/* Dynamic Background Selector - requested color options: black (default), green, pink, red, blue */}
          <div className="control-group">
            <div className="control-label" style={{ fontWeight: 600, marginBottom: '8px' }}>
              <span>Background Color</span>
            </div>
            <div className="bg-picker-container" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.keys(bgGradients).map((color) => (
                <button
                  key={color}
                  onClick={() => setBgType(color)}
                  title={`Set background to ${color}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: bgType === color ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    boxShadow: bgType === color ? '0 0 8px rgba(255, 255, 255, 0.6)' : 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    transform: bgType === color ? 'scale(1.15)' : 'scale(1)',
                    background: color === 'black' ? '#121212' : 
                                color === 'green' ? '#0d381e' : 
                                color === 'pink' ? '#421025' : 
                                color === 'red' ? '#400a0a' : '#0a1c40'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="control-checkbox">
            <input
              type="checkbox"
              id="lockAspect"
              checked={lockAspect}
              onChange={(e) => {
                const checked = e.target.checked;
                setLockAspect(checked);
                if (checked) {
                  // Trigger mapping update with the current zoomY value
                  handleZoomYChange(zoomY);
                }
              }}
            />
            <label htmlFor="lockAspect">Lock Aspect Ratio (Undistorted)</label>
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>Vertical Zoom (Y)</span>
              <span>{zoomY.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="0.5"
              max="3.0"
              step="0.01"
              value={zoomY}
              onChange={(e) => handleZoomYChange(parseFloat(e.target.value))}
            />
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>Horizontal Zoom (X)</span>
              <span>{zoomX.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="0.5"
              max="6.0"
              step="0.01"
              value={zoomX}
              disabled={lockAspect}
              onChange={(e) => {
                if (!lockAspect) {
                  setZoomX(parseFloat(e.target.value));
                }
              }}
            />
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>Vertical Offset (Y)</span>
              <span>{offsetY.toFixed(3)}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="-1.5"
              max="1.5"
              step="0.005"
              value={offsetY}
              onChange={(e) => setOffsetY(parseFloat(e.target.value))}
            />
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>Horizontal Offset (X)</span>
              <span>{offsetX.toFixed(3)}</span>
            </div>
            <input
              type="range"
              className="control-slider"
              min="-3.5"
              max="1.5"
              step="0.005"
              value={offsetX}
              disabled={lockAspect}
              onChange={(e) => {
                if (!lockAspect) {
                  setOffsetX(parseFloat(e.target.value));
                }
              }}
            />
          </div>

          <div className="control-label" style={{ marginTop: '15px', fontWeight: 600 }}>
            Code Snippet:
          </div>
          <div className="code-output">
            {`jabirTexture.repeat.set(${zoomX.toFixed(2)}, ${zoomY.toFixed(2)});\njabirTexture.offset.set(${offsetX.toFixed(3)}, ${offsetY.toFixed(3)});`}
            <button className="copy-btn" onClick={handleCopyCode}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
