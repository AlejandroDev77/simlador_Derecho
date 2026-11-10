import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Volume2, Sparkles, Sun, Moon } from './Icons';

interface Courtroom3DProps {
  currentSpeakerRole?: string;
  userRole?: string;
  activeSpeakerName?: string;
  isSpeakingAudio?: boolean;
}

type CameraPreset = 'auto' | 'general' | 'judge' | 'plaintiff' | 'defendant' | 'witness' | 'first_person';

export const Courtroom3D: React.FC<Courtroom3DProps> = ({
  currentSpeakerRole,
  userRole = 'abogado_demandante',
  activeSpeakerName,
  isSpeakingAudio = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading3D, setLoading3D] = useState(true);
  const [modelStatus, setModelStatus] = useState<string>('Construyendo Sala de Audiencias...');
  const [activePreset, setActivePreset] = useState<CameraPreset>('auto');
  const [brightLighting, setBrightLighting] = useState<boolean>(true);

  const activePresetRef = useRef<CameraPreset>('auto');
  const setCameraPresetRef = useRef<((preset: CameraPreset) => void) | null>(null);
  const isSpeakingAudioRef = useRef<boolean>(isSpeakingAudio);
  const currentSpeakerRoleRef = useRef<string | undefined>(currentSpeakerRole);
  const userRoleRef = useRef<string>(userRole);
  const toggleLightRef = useRef<((bright: boolean) => void) | null>(null);

  useEffect(() => {
    isSpeakingAudioRef.current = isSpeakingAudio;
  }, [isSpeakingAudio]);

  useEffect(() => {
    currentSpeakerRoleRef.current = currentSpeakerRole;
  }, [currentSpeakerRole]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    if (toggleLightRef.current) {
      toggleLightRef.current(brightLighting);
    }
  }, [brightLighting]);

  useEffect(() => {
    let animId: number;
    let renderer: THREE.WebGLRenderer | null = null;
    let isDisposed = false;

    const initScene = () => {
      try {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 540;

        // ==========================================
        // 1. ESCENA, CÁMARA Y RENDERIZADOR
        // ==========================================
        const scene = new THREE.Scene();
        // Fondo sobrio y cálido de tribunal de justicia (evita el blanco cegador)
        scene.background = new THREE.Color(0x181411);
        scene.fog = new THREE.FogExp2(0x181411, 0.015);

        const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
        camera.position.set(0, 3.6, 7.6);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = false; // Desactivado para máxima estabilidad y compatibilidad con drivers GPU

        const onContextLost = (e: Event) => {
          e.preventDefault();
          console.warn('Aviso: Contexto WebGL restableciéndose.');
        };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // Controles de Órbita
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.02;
        controls.minDistance = 2.0;
        controls.maxDistance = 18.0;
        controls.target.set(0, 1.25, -2.0);

        // ==========================================
        // 2. SISTEMA DE ILUMINACIÓN CÁLIDO Y EQUILIBRADO
        // ==========================================
        const ambientLight = new THREE.AmbientLight(0xfff5e8, 1.35);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffedd5, 1.25);
        keyLight.position.set(5, 12, 6);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xfef3c7, 0.7);
        fillLight.position.set(-6, 9, 3);
        scene.add(fillLight);

        const speakerSpotlight = new THREE.SpotLight(0xffedd5, 1.8, 26, Math.PI / 4, 0.5, 1.0);
        speakerSpotlight.position.set(0, 8.5, 0);
        scene.add(speakerSpotlight);

        const spotTarget = new THREE.Object3D();
        spotTarget.position.set(0, 1.5, -5.3);
        scene.add(spotTarget);
        speakerSpotlight.target = spotTarget;

        toggleLightRef.current = (bright: boolean) => {
          if (bright) {
            ambientLight.intensity = 1.35;
            keyLight.intensity = 1.25;
            fillLight.intensity = 0.7;
          } else {
            ambientLight.intensity = 0.95;
            keyLight.intensity = 0.9;
            fillLight.intensity = 0.45;
          }
        };

        // ==========================================
        // 3. ARQUITECTURA DE LA SALA DE AUDIENCIAS
        // ==========================================

        // Suelo: Madera de roble noble pulida y cálida
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({
          color: 0x422615,
          roughness: 0.35,
          metalness: 0.08
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Alfombra central ceremonial roja burdeos con filete dorado
        const carpetGeo = new THREE.PlaneGeometry(3.6, 12);
        const carpetMat = new THREE.MeshStandardMaterial({
          color: 0x82151e,
          roughness: 0.75
        });
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.01, -0.5);
        scene.add(carpet);

        // Borde dorado de la alfombra
        const borderMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 });
        const leftBorder = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 12), borderMat);
        leftBorder.position.set(-1.8, 0.015, -0.5);
        scene.add(leftBorder);
        const rightBorder = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 12), borderMat);
        rightBorder.position.set(1.8, 0.015, -0.5);
        scene.add(rightBorder);

        // Pared de fondo: Boiserie de caoba cálida
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e190e, roughness: 0.65 });
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, 10, 0.5), wallMat);
        backWall.position.set(0, 5, -8.5);
        scene.add(backWall);

        // Panel decorativo del tribunal detrás del juez
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x221108, roughness: 0.4, metalness: 0.1 });
        const judgePanel = new THREE.Mesh(new THREE.BoxGeometry(13.5, 5.2, 0.2), panelMat);
        judgePanel.position.set(0, 5.2, -8.2);
        scene.add(judgePanel);

        // Molduras y Pilastras clásicas flanqueando el estrado
        const marbleMat = new THREE.MeshStandardMaterial({ color: 0x82705e, roughness: 0.4 });
        const createPilaster = (x: number) => {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9.8, 0.3), marbleMat);
          col.position.set(x, 4.9, -8.25);
          scene.add(col);

          const capital = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.4), borderMat);
          capital.position.set(x, 9.6, -8.2);
          scene.add(capital);
        };
        createPilaster(-6.5);
        createPilaster(-4.0);
        createPilaster(4.0);
        createPilaster(6.5);

        // Escudo de la Justicia / Balanza Dorada en relieve
        const shieldGroup = new THREE.Group();
        const shieldGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.1, 32);
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.rotation.x = Math.PI / 2;
        shieldGroup.add(shieldMesh);

        // Detalles de la balanza
        const scaleBeam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.06), shieldMat);
        scaleBeam.position.set(0, 0.2, 0.08);
        shieldGroup.add(scaleBeam);

        const scaleStem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.06), shieldMat);
        scaleStem.position.set(0, -0.05, 0.08);
        shieldGroup.add(scaleStem);

        shieldGroup.position.set(0, 6.3, -8.05);
        scene.add(shieldGroup);

        // Estrado elevado del Magistrado-Juez
        const podiumMat = new THREE.MeshStandardMaterial({ color: 0x36190c, roughness: 0.38 });
        const judgePodium = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.85, 4.2), podiumMat);
        judgePodium.position.set(0, 0.425, -5.5);
        scene.add(judgePodium);

        // Mesa del Tribunal (Bench) en madera noble cálida
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x482312, roughness: 0.3, metalness: 0.08 });
        const judgeBench = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.05, 1.4), benchMat);
        judgeBench.position.set(0, 1.28, -5.0);
        scene.add(judgeBench);

        // Silla presidencial de cuero tras el juez
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x2e120b, roughness: 0.45 });
        const judgeChair = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.8), chairMat);
        judgeChair.position.set(0, 1.7, -6.4);
        scene.add(judgeChair);

        // Mazo judicial y base sonora sobre la mesa del juez
        const gavelGroup = new THREE.Group();
        const gavelBaseMat = new THREE.MeshStandardMaterial({ color: 0x4a2412, roughness: 0.25 });
        const gavelBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 16), gavelBaseMat);
        gavelGroup.add(gavelBlock);

        const gavelHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 16), gavelBaseMat);
        gavelHead.rotation.z = Math.PI / 2;
        gavelHead.position.set(0, 0.08, 0);
        gavelGroup.add(gavelHead);

        const gavelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 12), gavelBaseMat);
        gavelHandle.rotation.x = Math.PI / 2;
        gavelHandle.position.set(0, 0.08, 0.12);
        gavelGroup.add(gavelHandle);

        gavelGroup.position.set(0.9, 1.81, -4.8);
        scene.add(gavelGroup);

        // Mesas de las partes (Acusación / Demandante a la izq, Defensa a la dcha)
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x401f0f, roughness: 0.32 });
        const deskGeo = new THREE.BoxGeometry(3.5, 0.88, 1.35);

        const leftDesk = new THREE.Mesh(deskGeo, deskMat);
        leftDesk.position.set(-3.8, 0.65, -0.8);
        scene.add(leftDesk);

        const rightDesk = new THREE.Mesh(deskGeo, deskMat);
        rightDesk.position.set(3.8, 0.65, -0.8);
        scene.add(rightDesk);

        // Barandilla divisoria de la sala (Rail)
        const railMat = new THREE.MeshStandardMaterial({ color: 0x36190c, roughness: 0.3 });
        const rail = new THREE.Mesh(new THREE.BoxGeometry(15, 0.95, 0.18), railMat);
        rail.position.set(0, 0.5, 2.4);
        scene.add(rail);

        // Micrófonos forenses en las mesas
        const micMat = new THREE.MeshStandardMaterial({ color: 0x8a8a93, metalness: 0.85, roughness: 0.2 });
        const createMic = (pos: [number, number, number]) => {
          const micGroup = new THREE.Group();
          const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 16), micMat);
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 8), micMat);
          stem.position.set(0, 0.18, -0.05);
          stem.rotation.x = -0.3;
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), micMat);
          head.position.set(0, 0.34, -0.1);
          micGroup.add(base, stem, head);
          micGroup.position.set(...pos);
          scene.add(micGroup);
        };
        createMic([0, 1.81, -4.6]);
        createMic([-3.8, 1.1, -0.5]);
        createMic([3.8, 1.1, -0.5]);

        // Carpetas de autos / expedientes sobre las mesas
        const folderMatRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 });
        const folderMatBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45 });
        const folder1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.5), folderMatRed);
        folder1.position.set(-3.2, 1.11, -0.7);
        folder1.rotation.y = 0.2;
        scene.add(folder1);

        const folder2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.5), folderMatBlue);
        folder2.position.set(3.2, 1.11, -0.7);
        folder2.rotation.y = -0.15;
        scene.add(folder2);

        // ==========================================
        // 4. ANILLO Y HALO LUMINOSO DE ORADOR ACTIVO
        // ==========================================
        const auraGeo = new THREE.RingGeometry(0.7, 0.85, 32);
        const auraMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const speakerAura = new THREE.Mesh(auraGeo, auraMat);
        speakerAura.rotation.x = -Math.PI / 2;
        speakerAura.position.set(0, 0.02, -5.3);
        scene.add(speakerAura);

        // ==========================================
        // 5. CARGA Y ASIGNACIÓN DE PERSONAJES 3D
        // ==========================================
        setModelStatus('Posicionando intervinientes en sala...');
        const loader = new GLTFLoader();

        let judgeMesh: THREE.Object3D | null = null;
        let plaintiffMesh: THREE.Object3D | null = null;
        let defendantMesh: THREE.Object3D | null = null;

        // Posiciones base de cada personaje
        const basePositions = {
          judge: new THREE.Vector3(0, 0.85, -5.3),
          plaintiff: new THREE.Vector3(-3.8, 0, -1.0),
          defendant: new THREE.Vector3(3.8, 0, -1.0)
        };

        // Posiciones adelantadas cuando están hablando y sosteniendo alegatos
        const speechPositions = {
          judge: new THREE.Vector3(0, 0.88, -5.1),
          plaintiff: new THREE.Vector3(-2.8, 0, -1.7),
          defendant: new THREE.Vector3(2.8, 0, -1.7)
        };

        const loadCharacter = (path: string, position: THREE.Vector3, scale: number, rotationY = 0) => {
          return new Promise<THREE.Object3D>((resolve) => {
            loader.load(
              path,
              (gltf: any) => {
                if (isDisposed) return;
                const model = gltf.scene;
                model.position.copy(position);
                model.scale.set(scale, scale, scale);
                model.rotation.y = rotationY;
                scene.add(model);
                resolve(model);
              },
              undefined,
              (err: unknown) => {
                console.warn(`Error cargando ${path}, usando avatar procedural`, err);
                if (isDisposed) return;
                const fallbackGroup = new THREE.Group();
                const body = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.3, 0.35, 1.4, 16),
                  new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
                );
                body.position.y = 0.7;
                const head = new THREE.Mesh(
                  new THREE.SphereGeometry(0.2, 16, 16),
                  new THREE.MeshStandardMaterial({ color: 0xf5d0b5, roughness: 0.6 })
                );
                head.position.y = 1.55;
                fallbackGroup.add(body, head);
                fallbackGroup.position.copy(position);
                scene.add(fallbackGroup);
                resolve(fallbackGroup);
              }
            );
          });
        };

        Promise.all([
          loadCharacter('/models/juez1.glb', basePositions.judge, 1.5, 0),
          loadCharacter('/models/persona1.glb', basePositions.plaintiff, 1.5, 0.35),
          loadCharacter('/models/per2.glb', basePositions.defendant, 1.5, -0.35)
        ]).then(([jMesh, pMesh, dMesh]) => {
          if (isDisposed) return;
          judgeMesh = jMesh;
          plaintiffMesh = pMesh;
          defendantMesh = dMesh;
          setLoading3D(false);
        }).catch((e) => {
          console.warn('Error en carga de personajes 3D:', e);
          if (!isDisposed) setLoading3D(false);
        });

        // ==========================================
        // 6. GESTOR DE CÁMARA Y PERSPECTIVAS
        // ==========================================
        const targetCamPos = new THREE.Vector3().copy(camera.position);
        const targetCamLook = new THREE.Vector3().copy(controls.target);

        const applyPreset = (preset: CameraPreset) => {
          activePresetRef.current = preset;
          const uRole = userRoleRef.current;
          if (preset === 'general') {
            targetCamPos.set(0, 3.8, 7.8);
            targetCamLook.set(0, 1.25, -2.0);
          } else if (preset === 'judge') {
            targetCamPos.set(0, 2.1, -2.7);
            targetCamLook.set(0, 2.1, -5.3);
          } else if (preset === 'plaintiff') {
            targetCamPos.set(-1.8, 1.6, 0.9);
            targetCamLook.set(-3.8, 1.3, -1.2);
          } else if (preset === 'defendant') {
            targetCamPos.set(1.8, 1.6, 0.9);
            targetCamLook.set(3.8, 1.3, -1.2);
          } else if (preset === 'witness') {
            targetCamPos.set(-0.2, 1.5, -1.0);
            targetCamLook.set(0, 2.0, -5.2);
          } else if (preset === 'first_person') {
            if (uRole === 'juez') {
              targetCamPos.set(0, 2.2, -5.2);
              targetCamLook.set(0, 1.0, 1.0);
            } else if (uRole === 'abogado_demandante' || uRole === 'fiscal' || uRole === 'demandante') {
              targetCamPos.set(-3.8, 1.4, -0.8);
              targetCamLook.set(0, 1.8, -5.0);
            } else {
              targetCamPos.set(3.8, 1.4, -0.8);
              targetCamLook.set(0, 1.8, -5.0);
            }
          }
        };

        setCameraPresetRef.current = applyPreset;

        // ==========================================
        // 7. TECLADO Y MOVIMIENTO LIBRE (WASD / FLECHAS)
        // ==========================================
        const keysPressed: Record<string, boolean> = {};
        const onKeyDown = (e: KeyboardEvent) => {
          keysPressed[e.code] = true;
          if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            activePresetRef.current = 'general';
          }
        };
        const onKeyUp = (e: KeyboardEvent) => {
          keysPressed[e.code] = false;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // ==========================================
        // 8. BUCLE DE ANIMACIÓN Y RENDERIZADO (Con performance.now para máxima precisión y sin deprecaciones)
        // ==========================================
        let lastTime = performance.now();
        const startTime = performance.now();

        const animate = () => {
          if (isDisposed) return;
          animId = requestAnimationFrame(animate);
          const now = performance.now();
          const dt = Math.min((now - lastTime) / 1000, 0.1);
          const t = (now - startTime) / 1000;
          lastTime = now;

          const spkRole = currentSpeakerRoleRef.current;
          const isJudgeSpeaking = spkRole === 'juez';
          const isPlaintiffSpeaking = spkRole === 'demandante' || spkRole === 'abogado_demandante' || spkRole === 'fiscal';
          const isDefendantSpeaking = spkRole === 'demandado' || spkRole === 'abogado_demandado';

          // --- 8.1 MOVIMIENTO Y EXPRESIÓN DE PERSONAJES ---

          // JUEZ: Inclinación solemne, cabeceo al hablar y seguimiento visual
          if (judgeMesh) {
            const destPos = isJudgeSpeaking ? speechPositions.judge : basePositions.judge;
            judgeMesh.position.lerp(destPos, 0.05);

            if (isJudgeSpeaking) {
              judgeMesh.rotation.x = -0.06 + Math.sin(t * 7) * 0.045;
              judgeMesh.rotation.y = Math.sin(t * 2.5) * 0.08;
              judgeMesh.rotation.z = Math.cos(t * 4.5) * 0.02;
              judgeMesh.position.y = destPos.y + Math.abs(Math.sin(t * 8)) * 0.025;
            } else {
              judgeMesh.rotation.x = THREE.MathUtils.lerp(judgeMesh.rotation.x, 0, 0.05);
              const targetY = isPlaintiffSpeaking ? -0.25 : isDefendantSpeaking ? 0.25 : 0;
              judgeMesh.rotation.y = THREE.MathUtils.lerp(judgeMesh.rotation.y, targetY, 0.04);
              judgeMesh.rotation.z = THREE.MathUtils.lerp(judgeMesh.rotation.z, 0, 0.05);
              judgeMesh.scale.y = 1.5 + Math.sin(t * 2.2) * 0.012;
            }
          }

          // ACUSACIÓN / DEMANDANTE: Se adelanta al estrado, gesticula y mira al Juez
          if (plaintiffMesh) {
            const destPos = isPlaintiffSpeaking ? speechPositions.plaintiff : basePositions.plaintiff;
            plaintiffMesh.position.lerp(destPos, 0.06);

            if (isPlaintiffSpeaking) {
              const targetRotationY = 0.55;
              plaintiffMesh.rotation.y = THREE.MathUtils.lerp(plaintiffMesh.rotation.y, targetRotationY, 0.06);
              plaintiffMesh.rotation.x = Math.sin(t * 8) * 0.05;
              plaintiffMesh.rotation.z = Math.cos(t * 6) * 0.03;
              plaintiffMesh.position.y = destPos.y + Math.sin(t * 10) * 0.02;
            } else {
              const targetRotationY = isJudgeSpeaking ? 0.45 : isDefendantSpeaking ? 0.75 : 0.35;
              plaintiffMesh.rotation.y = THREE.MathUtils.lerp(plaintiffMesh.rotation.y, targetRotationY, 0.04);
              plaintiffMesh.rotation.x = THREE.MathUtils.lerp(plaintiffMesh.rotation.x, 0, 0.05);
              plaintiffMesh.rotation.z = THREE.MathUtils.lerp(plaintiffMesh.rotation.z, 0, 0.05);
              plaintiffMesh.scale.y = 1.5 + Math.sin(t * 2.0 + 1) * 0.012;
            }
          }

          // DEFENSA: Se adelanta al estrado, refuta y gesticula
          if (defendantMesh) {
            const destPos = isDefendantSpeaking ? speechPositions.defendant : basePositions.defendant;
            defendantMesh.position.lerp(destPos, 0.06);

            if (isDefendantSpeaking) {
              const targetRotationY = -0.55;
              defendantMesh.rotation.y = THREE.MathUtils.lerp(defendantMesh.rotation.y, targetRotationY, 0.06);
              defendantMesh.rotation.x = Math.sin(t * 8.5) * 0.05;
              defendantMesh.rotation.z = Math.cos(t * 6.5) * 0.035;
              defendantMesh.position.y = destPos.y + Math.sin(t * 10.5) * 0.02;
            } else {
              const targetRotationY = isJudgeSpeaking ? -0.45 : isPlaintiffSpeaking ? -0.75 : -0.35;
              defendantMesh.rotation.y = THREE.MathUtils.lerp(defendantMesh.rotation.y, targetRotationY, 0.04);
              defendantMesh.rotation.x = THREE.MathUtils.lerp(defendantMesh.rotation.x, 0, 0.05);
              defendantMesh.rotation.z = THREE.MathUtils.lerp(defendantMesh.rotation.z, 0, 0.05);
              defendantMesh.scale.y = 1.5 + Math.sin(t * 2.1 + 2) * 0.012;
            }
          }

          // --- 8.2 ACTUALIZACIÓN DE SPOTLIGHT Y AURA ---
          let activeSpeakerCoords = basePositions.judge;
          if (isPlaintiffSpeaking) activeSpeakerCoords = speechPositions.plaintiff;
          else if (isDefendantSpeaking) activeSpeakerCoords = speechPositions.defendant;

          spotTarget.position.lerp(activeSpeakerCoords, 0.06);
          speakerSpotlight.position.set(activeSpeakerCoords.x * 0.5, 8.5, activeSpeakerCoords.z + 3);

          speakerAura.position.x = activeSpeakerCoords.x;
          speakerAura.position.z = activeSpeakerCoords.z;
          const auraPulse = 0.5 + Math.sin(t * 5) * 0.35;
          auraMat.opacity = isSpeakingAudioRef.current ? auraPulse : 0.4;
          speakerAura.rotation.z = t * 0.5;

          // --- 8.3 AUTO-DIRECTOR: SEGUIMIENTO AUTOMÁTICO DE CÁMARA ---
          if (activePresetRef.current === 'auto') {
            if (isJudgeSpeaking) {
              targetCamPos.set(0, 2.2, -2.5);
              targetCamLook.set(0, 2.0, -5.3);
            } else if (isPlaintiffSpeaking) {
              targetCamPos.set(-1.8, 1.8, 0.6);
              targetCamLook.set(-2.8, 1.4, -1.7);
            } else if (isDefendantSpeaking) {
              targetCamPos.set(1.8, 1.8, 0.6);
              targetCamLook.set(2.8, 1.4, -1.7);
            } else {
              targetCamPos.set(0, 3.6, 7.6);
              targetCamLook.set(0, 1.25, -2.0);
            }
          }

          // Movimiento libre con teclado WASD / Flechas
          const moveSpeed = 6.5 * dt;
          const forward = new THREE.Vector3();
          camera.getWorldDirection(forward);
          forward.y = 0;
          forward.normalize();

          const right = new THREE.Vector3();
          right.crossVectors(camera.up, forward).normalize();

          if (keysPressed['KeyW'] || keysPressed['ArrowUp']) {
            targetCamPos.addScaledVector(forward, moveSpeed);
            targetCamLook.addScaledVector(forward, moveSpeed);
          }
          if (keysPressed['KeyS'] || keysPressed['ArrowDown']) {
            targetCamPos.addScaledVector(forward, -moveSpeed);
            targetCamLook.addScaledVector(forward, -moveSpeed);
          }
          if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) {
            targetCamPos.addScaledVector(right, moveSpeed);
            targetCamLook.addScaledVector(right, moveSpeed);
          }
          if (keysPressed['KeyD'] || keysPressed['ArrowRight']) {
            targetCamPos.addScaledVector(right, -moveSpeed);
            targetCamLook.addScaledVector(right, -moveSpeed);
          }
          if (keysPressed['KeyQ']) {
            targetCamPos.y += moveSpeed;
            targetCamLook.y += moveSpeed;
          }
          if (keysPressed['KeyE']) {
            targetCamPos.y = Math.max(0.8, targetCamPos.y - moveSpeed);
            targetCamLook.y = Math.max(0.5, targetCamLook.y - moveSpeed);
          }

          // Interpolación suave de cámara
          camera.position.lerp(targetCamPos, 0.05);
          controls.target.lerp(targetCamLook, 0.05);
          controls.update();

          if (renderer) {
            renderer.render(scene, camera);
          }
        };

        animate();

        // Manejar redimensionamiento reactivo tanto de ventana como de contenedor
        const handleResize = () => {
          if (!containerRef.current || !renderer) return;
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight || 540;
          if (w === 0 || h === 0) return;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          resizeObserver = new ResizeObserver(() => handleResize());
          resizeObserver.observe(containerRef.current);
        }

        return () => {
          isDisposed = true;
          cancelAnimationFrame(animId);
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
          if (renderer && renderer.domElement) {
            renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
            renderer.dispose();
          }
        };
      } catch (err) {
        console.error('Error inicializando Three.js en Sala 3D:', err);
        setModelStatus('Aviso: Visualizador 3D en modo de compatibilidad básica.');
        setLoading3D(false);
      }
    };

    const cleanup = initScene();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleSelectPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    if (setCameraPresetRef.current) {
      setCameraPresetRef.current(preset);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[480px] xl:min-h-[580px] rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 shadow-2xl">
      {/* Contenedor WebGL */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Pantalla de Carga 3D */}
      {loading3D && (
        <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-20">
          <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <h4 className="text-sm font-bold text-stone-100 flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Construyendo Sala de Audiencias</span>
            </h4>
            <p className="text-xs text-stone-400 mt-1">{modelStatus}</p>
          </div>
        </div>
      )}

      {/* Indicador de Orador Activo en la esquina superior izquierda */}
      <div className="absolute top-3.5 left-3.5 flex items-center space-x-2 pointer-events-none z-10">
        <span className="px-3 py-1.5 rounded-xl bg-stone-900/90 border border-stone-700 text-xs text-amber-400 font-bold backdrop-blur-md shadow-lg flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Tribunal Superior • Sala Nº 1</span>
        </span>
        {activeSpeakerName && (
          <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold shadow-lg animate-pulse flex items-center space-x-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Orador: {activeSpeakerName}</span>
          </span>
        )}
      </div>

      {/* Controles Superiores Derechos: Iluminación y Ángulos de Cámara */}
      <div className="absolute top-3.5 right-3.5 flex items-center space-x-2 z-10">
        {/* Toggle de Iluminación Suave / Brillante */}
        <button
          onClick={() => setBrightLighting(!brightLighting)}
          className={`p-2 rounded-xl border backdrop-blur-md transition-all shadow-lg flex items-center space-x-1 text-xs font-semibold ${
            brightLighting
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:text-stone-200'
          }`}
          title={brightLighting ? 'Iluminación Clara' : 'Iluminación Suave'}
        >
          {brightLighting ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-400" />}
          <span className="hidden sm:inline">{brightLighting ? 'Luz Clara' : 'Luz Suave'}</span>
        </button>

        {/* Selector de Ángulos de Cámara */}
        <div className="flex items-center space-x-1 bg-stone-900/85 backdrop-blur-md p-1 rounded-xl border border-stone-700/80 shadow-xl">
          <button
            onClick={() => handleSelectPreset('auto')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
              activePreset === 'auto'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Auto-director cinematográfico: enfoca automáticamente a quien habla"
          >
            <span>🎬</span>
            <span className="hidden md:inline">Auto-Director</span>
          </button>

          <button
            onClick={() => handleSelectPreset('general')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePreset === 'general'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Vista panorámica de toda la sala"
          >
            🏛️ <span className="hidden lg:inline">General</span>
          </button>

          <button
            onClick={() => handleSelectPreset('judge')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePreset === 'judge'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Plano del Tribunal / Magistrado"
          >
            ⚖️ <span className="hidden lg:inline">Juez</span>
          </button>

          <button
            onClick={() => handleSelectPreset('plaintiff')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePreset === 'plaintiff'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Mesa de la Acusación"
          >
            💼 <span className="hidden lg:inline">Acusación</span>
          </button>

          <button
            onClick={() => handleSelectPreset('defendant')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePreset === 'defendant'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Mesa de la Defensa"
          >
            🛡️ <span className="hidden lg:inline">Defensa</span>
          </button>

          <button
            onClick={() => handleSelectPreset('first_person')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePreset === 'first_person'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Perspectiva en primera persona desde tu asiento procesal"
          >
            👁️ <span className="hidden sm:inline">Mi Rol</span>
          </button>
        </div>
      </div>

      {/* Guía de Controles y Navegación Libre (WASD / Ratón) */}
      <div className="absolute bottom-3 left-3 bg-stone-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-700/80 text-[11px] text-stone-300 pointer-events-none z-10 flex items-center space-x-3 shadow-lg">
        <span>🎮 <strong>W/A/S/D</strong>: Caminar</span>
        <span>•</span>
        <span><strong>Q/E</strong>: Elevar</span>
        <span>•</span>
        <span><strong>Arrastrar</strong>: Orbitar 360°</span>
        <span>•</span>
        <span><strong>Rueda</strong>: Zoom</span>
      </div>
    </div>
  );
};
