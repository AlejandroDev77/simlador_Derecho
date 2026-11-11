import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Volume2, Sparkles, Sun, Moon, Camera, Scale, Shield, User, Eye, Compass } from './Icons';
import type { Participant } from '../types';

interface Courtroom3DProps {
  currentSpeakerRole?: string;
  userRole?: string;
  activeSpeakerName?: string;
  isSpeakingAudio?: boolean;
  participants?: Participant[];
}

type CameraPreset = 'auto' | 'general' | 'judge' | 'plaintiff' | 'defendant' | 'witness' | 'first_person';

export const Courtroom3D: React.FC<Courtroom3DProps> = ({
  currentSpeakerRole,
  userRole = 'abogado_demandante',
  activeSpeakerName,
  isSpeakingAudio = false,
  participants = []
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

        // ==========================================
        // 3.1 AMBIENTACIÓN INSTITUCIONAL DE BOLIVIA
        // ==========================================
        const createCanvasTex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) draw(ctx);
          const tex = new THREE.CanvasTexture(canvas);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          return tex;
        };

        // Textura Bandera Tricolor de Bolivia con Escudo central
        const boliviaFlagTex = createCanvasTex(512, 340, (ctx) => {
          ctx.fillStyle = '#D52B1E';
          ctx.fillRect(0, 0, 512, 113);
          ctx.fillStyle = '#F9E300';
          ctx.fillRect(0, 113, 512, 114);
          ctx.fillStyle = '#007934';
          ctx.fillRect(0, 227, 512, 113);

          // Escudo estilizado al centro de la franja amarilla
          ctx.save();
          ctx.translate(256, 170);
          // Banderas laterales cruzadas
          ctx.fillStyle = '#D52B1E';
          ctx.fillRect(-38, -22, 76, 8);
          ctx.fillStyle = '#007934';
          ctx.fillRect(-38, 12, 76, 8);
          // Óvalo dorado y azul
          ctx.beginPath();
          ctx.ellipse(0, 0, 26, 32, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#C5A15B';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#1D4ED8';
          ctx.fill();
          // Cerro Rico y sol naciente
          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(0, -10, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#92400E';
          ctx.beginPath();
          ctx.moveTo(-15, 16);
          ctx.lineTo(0, -4);
          ctx.lineTo(15, 16);
          ctx.closePath();
          ctx.fill();
          // Cóndor estilizado superior
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.moveTo(-22, -33);
          ctx.quadraticCurveTo(0, -44, 22, -33);
          ctx.lineTo(0, -28);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // Banderas institucionales en el estrado (Doble Bandera Tricolor de Bolivia)

        // Textura central: Escudo Nacional de Bolivia + Órgano Judicial
        const centralEscudoTex = createCanvasTex(640, 440, (ctx) => {
          ctx.fillStyle = '#14263D';
          ctx.fillRect(0, 0, 640, 440);
          ctx.strokeStyle = '#C5A15B';
          ctx.lineWidth = 10;
          ctx.strokeRect(14, 14, 612, 412);
          ctx.lineWidth = 3;
          ctx.strokeRect(26, 26, 588, 388);

          // Emblema circular Escudo
          ctx.save();
          ctx.translate(320, 178);
          ctx.beginPath();
          ctx.arc(0, 0, 108, 0, Math.PI * 2);
          ctx.fillStyle = '#1D3350';
          ctx.fill();
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#D4AF37';
          ctx.stroke();

          // Banderas tricolores cruzadas detrás del óvalo
          const drawCrossFlag = (angle: number) => {
            ctx.save();
            ctx.rotate(angle);
            ctx.fillStyle = '#D52B1E';
            ctx.fillRect(-92, -16, 184, 10);
            ctx.fillStyle = '#F9E300';
            ctx.fillRect(-92, -6, 184, 10);
            ctx.fillStyle = '#007934';
            ctx.fillRect(-92, 4, 184, 10);
            ctx.restore();
          };
          drawCrossFlag(0.32);
          drawCrossFlag(-0.32);

          // Laurel / Olivo
          ctx.strokeStyle = '#4ADE80';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 8, 72, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();

          // Óvalo central
          ctx.beginPath();
          ctx.ellipse(0, 0, 52, 66, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#D4AF37';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(0, 0, 42, 55, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#0F294A';
          ctx.fill();

          // Sol y Cerro Rico
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(0, -20, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#B45309';
          ctx.beginPath();
          ctx.moveTo(-30, 32);
          ctx.lineTo(0, -10);
          ctx.lineTo(30, 32);
          ctx.closePath();
          ctx.fill();

          // Cóndor Andino encima
          ctx.fillStyle = '#F8FAFC';
          ctx.beginPath();
          ctx.moveTo(-48, -68);
          ctx.quadraticCurveTo(0, -94, 48, -68);
          ctx.lineTo(0, -56);
          ctx.closePath();
          ctx.fill();

          // 9 estrellas departamentales en arco inferior
          ctx.fillStyle = '#FDE047';
          for (let i = 0; i < 9; i++) {
            const ang = Math.PI * 0.18 + (i / 8) * Math.PI * 0.64;
            const sx = Math.cos(ang) * 86;
            const sy = Math.sin(ang) * 82 + 4;
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          ctx.fillStyle = '#E5C98B';
          ctx.font = 'bold 24px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText('ESTADO PLURINACIONAL DE BOLIVIA', 320, 342);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 28px Georgia, serif';
          ctx.fillText('ÓRGANO JUDICIAL', 320, 382);
        });

        // Placas laterales constitucionales / judiciales
        const createWallPlaqueTex = (heading: string, mainText: string, subText: string) =>
          createCanvasTex(512, 340, (ctx) => {
            ctx.fillStyle = '#2A140A';
            ctx.fillRect(0, 0, 512, 340);
            ctx.strokeStyle = '#C5A15B';
            ctx.lineWidth = 8;
            ctx.strokeRect(14, 14, 484, 312);
            ctx.fillStyle = '#14263D';
            ctx.fillRect(26, 26, 460, 288);

            // Cinta tricolor superior discreta
            ctx.fillStyle = '#D52B1E';
            ctx.fillRect(46, 46, 420, 5);
            ctx.fillStyle = '#F9E300';
            ctx.fillRect(46, 51, 420, 5);
            ctx.fillStyle = '#007934';
            ctx.fillRect(46, 56, 420, 5);

            ctx.fillStyle = '#C5A15B';
            ctx.font = 'bold 21px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText(heading, 256, 118);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 25px Georgia, serif';
            ctx.fillText(mainText, 256, 178);

            ctx.fillStyle = '#CBD5E1';
            ctx.font = 'italic 18px Georgia, serif';
            ctx.fillText(subText, 256, 236);
          });

        const centralPlaque = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 2.2, 0.08),
          new THREE.MeshStandardMaterial({ map: centralEscudoTex, roughness: 0.3, metalness: 0.15 })
        );
        centralPlaque.position.set(0, 4.75, -8.06);
        scene.add(centralPlaque);

        const leftWallPlaque = new THREE.Mesh(
          new THREE.BoxGeometry(1.9, 1.25, 0.07),
          new THREE.MeshStandardMaterial({
            map: createWallPlaqueTex(
              'PRINCIPIOS ÉTICOS • ART. 8 C.P.E.',
              'AMA QHILLA • AMA LLULLA • AMA SUWA',
              'Suma Qamaña • Vivir Bien'
            ),
            roughness: 0.32,
          })
        );
        leftWallPlaque.position.set(-5.25, 4.75, -8.07);
        scene.add(leftWallPlaque);

        const rightWallPlaque = new THREE.Mesh(
          new THREE.BoxGeometry(1.9, 1.25, 0.07),
          new THREE.MeshStandardMaterial({
            map: createWallPlaqueTex(
              'TRIBUNAL DE JUSTICIA',
              'VERDAD MATERIAL Y DEBIDO PROCESO',
              'Ley N° 025 del Órgano Judicial'
            ),
            roughness: 0.32,
          })
        );
        rightWallPlaque.position.set(5.25, 4.75, -8.07);
        scene.add(rightWallPlaque);

        // Apliques de iluminación dorada flanqueando el escudo nacional
        const brassSconceMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 });
        const glowBulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        [-2.25, 2.25].forEach((sx) => {
          const sconce = new THREE.Group();
          const backplate = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16), brassSconceMat);
          backplate.rotation.x = Math.PI / 2;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), glowBulbMat);
          bulb.position.set(0, 0.1, 0.12);
          sconce.add(backplate, bulb);
          sconce.position.set(sx, 4.75, -8.05);
          scene.add(sconce);
        });

        // Banderas Tricolores de Bolivia en ambos extremos del estrado
        const animatedFlags: { mesh: THREE.Mesh; baseX: Float32Array; phase: number }[] = [];
        const createCourtFlag = (
          tex: THREE.Texture,
          pos: [number, number, number],
          rotY: number,
          width: number,
          height: number,
          phase: number
        ) => {
          const flagGroup = new THREE.Group();
          const poleBaseMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.82, roughness: 0.22 });
          const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.1, 20), poleBaseMat);
          stand.position.y = 0.05;
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 3.15, 16), poleBaseMat);
          pole.position.y = 1.62;
          const finial = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 14), poleBaseMat);
          finial.position.y = 3.28;
          flagGroup.add(stand, pole, finial);

          const clothGeo = new THREE.PlaneGeometry(width, height, 14, 8);
          const clothMat = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,
            roughness: 0.58,
          });
          const cloth = new THREE.Mesh(clothGeo, clothMat);
          cloth.position.set(width * 0.5 + 0.02, 2.58, 0);
          flagGroup.add(cloth);

          const posAttr = clothGeo.attributes.position as THREE.BufferAttribute;
          const baseX = new Float32Array(posAttr.count);
          for (let i = 0; i < posAttr.count; i++) {
            baseX[i] = posAttr.getX(i);
          }
          animatedFlags.push({ mesh: cloth, baseX, phase });

          flagGroup.position.set(...pos);
          flagGroup.rotation.y = rotY;
          scene.add(flagGroup);
        };

        // Banderas Tricolores de Bolivia flanqueando ambos lados del estrado (fuera de toda ruta de paso)
        createCourtFlag(boliviaFlagTex, [-3.15, 0.85, -6.25], 0.35, 1.55, 1.02, 0);
        createCourtFlag(boliviaFlagTex, [3.15, 0.85, -6.25], -0.35 + Math.PI, 1.55, 1.02, 1.7);

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

        // Placa frontal del estrado con bandera boliviana y leyenda del Órgano Judicial
        const benchFrontTex = createCanvasTex(512, 160, (ctx) => {
          ctx.fillStyle = '#14263D';
          ctx.fillRect(0, 0, 512, 160);
          ctx.strokeStyle = '#C5A15B';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, 496, 144);
          ctx.fillStyle = '#D52B1E';
          ctx.fillRect(36, 26, 440, 8);
          ctx.fillStyle = '#F9E300';
          ctx.fillRect(36, 34, 440, 8);
          ctx.fillStyle = '#007934';
          ctx.fillRect(36, 42, 440, 8);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 26px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText('ÓRGANO JUDICIAL • BOLIVIA', 256, 98);
          ctx.fillStyle = '#C5A15B';
          ctx.font = '16px Georgia, serif';
          ctx.fillText('SALA DE AUDIENCIA ORAL Y PÚBLICA', 256, 130);
        });
        const benchCrest = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, 0.65, 0.04),
          new THREE.MeshStandardMaterial({ map: benchFrontTex, roughness: 0.35 })
        );
        benchCrest.position.set(0, 1.32, -4.29);
        scene.add(benchCrest);

        // Libros jurídicos bolivianos (C.P.E., Ley 025, Códigos) sobre escritorios
        const createLawBook = (title: string, coverColor: string, spineColor: string, pos: [number, number, number], rotY: number) => {
          const bookTex = createCanvasTex(256, 192, (ctx) => {
            ctx.fillStyle = coverColor;
            ctx.fillRect(0, 0, 256, 192);
            ctx.strokeStyle = '#C5A15B';
            ctx.lineWidth = 8;
            ctx.strokeRect(10, 10, 236, 172);
            ctx.fillStyle = spineColor;
            ctx.fillRect(10, 10, 28, 172);
            ctx.fillStyle = '#D52B1E';
            ctx.fillRect(54, 34, 166, 6);
            ctx.fillStyle = '#F9E300';
            ctx.fillRect(54, 40, 166, 6);
            ctx.fillStyle = '#007934';
            ctx.fillRect(54, 46, 166, 6);
            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 22px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, 138, 108);
            ctx.fillStyle = '#C5A15B';
            ctx.font = 'bold 14px Georgia, serif';
            ctx.fillText('BOLIVIA', 138, 142);
          });
          const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.055, 0.42),
            new THREE.MeshStandardMaterial({ map: bookTex, roughness: 0.42 })
          );
          book.position.set(pos[0], pos[1] + 0.028, pos[2]);
          book.rotation.y = rotY;
          scene.add(book);
        };

        createLawBook('C.P.E.', '#14263D', '#0B1624', [-1.15, 1.81, -4.75], 0.14);
        createLawBook('LEY 025', '#581C1C', '#3B0F0F', [-1.12, 1.865, -4.77], -0.08);
        createLawBook('C.P.E.', '#14263D', '#0B1624', [-4.45, 1.1, -0.78], 0.12);
        createLawBook('CÓDIGO PROC.', '#1E3A5F', '#0F1E31', [4.45, 1.1, -0.78], -0.18);

        // Arreglos florales de Kantuta (flor nacional de Bolivia) en floreros de bronce
        const createKantutaVase = (pos: [number, number, number]) => {
          const vaseGroup = new THREE.Group();
          const vaseMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.78, roughness: 0.25 });
          const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.24, 16), vaseMat);
          vase.position.y = 0.12;
          vaseGroup.add(vase);

          const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
          const redPetalMat = new THREE.MeshStandardMaterial({ color: 0xd52b1e, roughness: 0.45 });
          const goldPetalMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.24, 6), leafMat);
            stem.position.set(Math.cos(ang) * 0.05, 0.3, Math.sin(ang) * 0.05);
            stem.rotation.z = Math.cos(ang) * 0.28;
            stem.rotation.x = Math.sin(ang) * 0.28;
            const bellRed = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 8), redPetalMat);
            bellRed.position.set(Math.cos(ang) * 0.1, 0.39, Math.sin(ang) * 0.1);
            bellRed.rotation.x = Math.PI;
            const bellTip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), goldPetalMat);
            bellTip.position.set(Math.cos(ang) * 0.1, 0.35, Math.sin(ang) * 0.1);
            vaseGroup.add(stem, bellRed, bellTip);
          }
          vaseGroup.position.set(...pos);
          scene.add(vaseGroup);
        };
        createKantutaVase([-2.38, 1.81, -4.92]);
        createKantutaVase([2.38, 1.81, -4.92]);

        // Mesita ceremonial lateral con tejido Aguayo Andino (lado izquierdo, libre de rutas)
        const aguayoTex = createCanvasTex(512, 256, (ctx) => {
          const bands = [
            { h: 28, c: '#B91C1C' },
            { h: 16, c: '#FACC15' },
            { h: 24, c: '#0F766E' },
            { h: 14, c: '#FFFFFF' },
            { h: 28, c: '#1D4ED8' },
            { h: 24, c: '#BE185D' },
            { h: 28, c: '#B91C1C' },
            { h: 24, c: '#15803D' },
            { h: 16, c: '#FACC15' },
            { h: 54, c: '#991B1B' },
          ];
          let y = 0;
          for (const b of bands) {
            ctx.fillStyle = b.c;
            ctx.fillRect(0, y, 512, b.h);
            y += b.h;
          }
          // Rombos andinos sobre franja central
          ctx.fillStyle = '#FFFFFF';
          for (let x = 20; x < 500; x += 36) {
            ctx.beginPath();
            ctx.moveTo(x, 128);
            ctx.lineTo(x + 12, 114);
            ctx.lineTo(x + 24, 128);
            ctx.lineTo(x + 12, 142);
            ctx.closePath();
            ctx.fill();
          }
        });
        const sideTableGroup = new THREE.Group();
        const sideTableMat = new THREE.MeshStandardMaterial({ color: 0x3b1c0e, roughness: 0.35 });
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.9), sideTableMat);
        tableTop.position.y = 0.85;
        sideTableGroup.add(tableTop);
        [-0.55, 0.55].forEach((lx) => {
          [-0.36, 0.36].forEach((lz) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.07), sideTableMat);
            leg.position.set(lx, 0.425, lz);
            sideTableGroup.add(leg);
          });
        });
        const aguayoRunner = new THREE.Mesh(
          new THREE.BoxGeometry(1.18, 0.02, 0.72),
          new THREE.MeshStandardMaterial({ map: aguayoTex, roughness: 0.82 })
        );
        aguayoRunner.position.y = 0.9;
        sideTableGroup.add(aguayoRunner);
        sideTableGroup.position.set(-5.85, 0, -4.95);
        sideTableGroup.rotation.y = 0.25;
        scene.add(sideTableGroup);
        createKantutaVase([-5.85, 0.91, -4.95]);
        createLawBook('C.P.E.', '#14263D', '#0B1624', [-5.55, 0.91, -4.85], 0.35);

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

        // Sillas de estrado para las partes y letrados
        const partyChairMat = new THREE.MeshStandardMaterial({ color: 0x22120a, roughness: 0.5 });
        const createPartyChair = (x: number, z: number, rotY = 0) => {
          const chairGroup = new THREE.Group();
          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.5), partyChairMat);
          seat.position.y = 0.5;
          const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.08), partyChairMat);
          back.position.set(0, 0.85, -0.21);
          chairGroup.add(seat, back);
          chairGroup.position.set(x, 0, z);
          chairGroup.rotation.y = rotY;
          scene.add(chairGroup);
        };
        createPartyChair(-3.0, -1.5, 0.2);
        createPartyChair(-4.5, -1.5, 0.15);
        createPartyChair(3.0, -1.5, -0.2);
        createPartyChair(4.5, -1.5, -0.15);

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

        let judgeMesh: THREE.Group | null = null;
        let lawyerPlaintiffMesh: THREE.Group | null = null;
        let plaintiffMesh: THREE.Group | null = null;
        let lawyerDefendantMesh: THREE.Group | null = null;
        let defendantMesh: THREE.Group | null = null;

        // Posiciones base de los 5 intervinientes en la sala
        const basePositions = {
          judge: new THREE.Vector3(0, 0.85, -5.7),
          lawyerPlaintiff: new THREE.Vector3(-3.0, 0, -1.3),
          plaintiff: new THREE.Vector3(-4.5, 0, -1.3),
          lawyerDefendant: new THREE.Vector3(3.0, 0, -1.3),
          defendant: new THREE.Vector3(4.5, 0, -1.3)
        };

        // Posiciones de intervención: Los abogados se desplazan al CENTRO de la sala (alfombra burdeos)
        const speechPositions = {
          judge: new THREE.Vector3(0, 0.88, -5.2),
          lawyerPlaintiff: new THREE.Vector3(-0.35, 0, -2.3), // Camina al centro del plenario ante el estrado
          plaintiff: new THREE.Vector3(-1.4, 0, -2.6),         // Avanza a testificar/declarar
          lawyerDefendant: new THREE.Vector3(0.35, 0, -2.3),  // Camina al centro del plenario ante el estrado
          defendant: new THREE.Vector3(1.4, 0, -2.6)          // Avanza a prestar declaración
        };

        // Función robusta de carga con normalización de altura y apoyo en suelo (Box3)
        const loadCharacter = (path: string, position: THREE.Vector3, targetHeight = 1.75, rotationY = 0) => {
          return new Promise<THREE.Group>((resolve) => {
            const characterGroup = new THREE.Group();
            characterGroup.position.copy(position);
            characterGroup.rotation.y = rotationY;

            loader.load(
              path,
              (gltf: any) => {
                if (isDisposed) return;
                const model = gltf.scene;

                // Corrección de orientación para modelos Tripo 3D (juez1 y persona1 vienen exportados con vista lateral a +X)
                // Rotar -90° para que su frente mire directamente hacia +Z (hacia la sala y tribunal)
                if (path.includes('juez1') || path.includes('persona1')) {
                  model.rotation.y = -Math.PI / 2;
                }

                // 1. Calcular caja envolvente y dimensiones reales del modelo ya reorientado
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);

                // 2. Escalar proporcionalmente para que mida exactamente targetHeight (ej. 1.75m)
                const currentHeight = size.y || 1.0;
                const scaleFactor = targetHeight / currentHeight;
                model.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // 3. Recalcular la caja escalada para centrar en X/Z y alinear los pies exactamente a y=0
                const scaledBox = new THREE.Box3().setFromObject(model);
                const scaledCenter = new THREE.Vector3();
                scaledBox.getCenter(scaledCenter);

                model.position.x = -scaledCenter.x;
                model.position.z = -scaledCenter.z;
                model.position.y = -scaledBox.min.y; // Apoyo perfecto en suelo o tarima

                // Optimizar rugosidad de materiales
                model.traverse((child: any) => {
                  if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach((m: any) => { m.roughness = 0.55; });
                    } else {
                      child.material.roughness = 0.55;
                    }
                  }
                });

                characterGroup.add(model);
                scene.add(characterGroup);
                resolve(characterGroup);
              },
              undefined,
              (err: unknown) => {
                console.warn(`Aviso cargando ${path}, creando avatar procedimental:`, err);
                if (isDisposed) return;
                const fallbackGroup = new THREE.Group();
                const body = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.28, 0.32, 1.3, 16),
                  new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
                );
                body.position.y = 0.65;
                const head = new THREE.Mesh(
                  new THREE.SphereGeometry(0.18, 16, 16),
                  new THREE.MeshStandardMaterial({ color: 0xf5d0b5, roughness: 0.6 })
                );
                head.position.y = 1.45;
                fallbackGroup.add(body, head);
                characterGroup.add(fallbackGroup);
                scene.add(characterGroup);
                resolve(characterGroup);
              }
            );
          });
        };

        // Detección dinámica de género y asignación de modelos 3D (abogado1_hombre / abogada1_mujer):
        const inferGenderFromParticipant = (p?: Participant, fallback: 'male' | 'female' = 'male'): 'male' | 'female' => {
          if (p?.gender === 'female' || p?.gender === 'male') return p.gender;
          const txt = `${p?.name || ''} ${p?.description || ''}`.toLowerCase();
          if (/\b(doña|dña|dra|sra|señora|abogada|jueza|defensora|mar[ií]a|elena|luc[ií]a|carmen|laura|ana|rosa|valeria|sof[ií]a|patricia|claudia|andrea|paula|gabriela|daniela|carolina|ver[oó]nica|natalia|fernanda|alejandra|camila|adriana|lorena|mariana|isabel|sandra|carla|roxana|ximena|jimena)\b/i.test(txt)) {
            return 'female';
          }
          return fallback;
        };

        const resolveModelByRoles = (roles: string[], fallbackGender: 'male' | 'female') => {
          const found = (participants || []).find((p) => roles.includes(p.role));
          const detectedGender = inferGenderFromParticipant(found, fallbackGender);
          return detectedGender === 'female' ? '/models/abogada1_mujer.glb' : '/models/abogado1_hombre.glb';
        };

        const lawyerPlaintiffModel = resolveModelByRoles(['abogado_demandante', 'fiscal'], 'male');
        const plaintiffModel = resolveModelByRoles(['demandante'], 'male');
        const lawyerDefendantModel = resolveModelByRoles(['abogado_demandado', 'abogado_defensor'], 'female');
        const defendantModel = resolveModelByRoles(['demandado'], 'male');

        // Carga simultánea de los 5 personajes según género detectado en el expediente:
        Promise.all([
          loadCharacter('/models/juez1.glb', basePositions.judge, 1.75, 0),
          loadCharacter(lawyerPlaintiffModel, basePositions.lawyerPlaintiff, 1.75, 0.45),
          loadCharacter(plaintiffModel, basePositions.plaintiff, 1.72, 0.35),
          loadCharacter(lawyerDefendantModel, basePositions.lawyerDefendant, 1.75, -0.45),
          loadCharacter(defendantModel, basePositions.defendant, 1.72, -0.35)
        ]).then(([jMesh, lpMesh, pMesh, ldMesh, dMesh]) => {
          if (isDisposed) return;
          judgeMesh = jMesh;
          lawyerPlaintiffMesh = lpMesh;
          plaintiffMesh = pMesh;
          lawyerDefendantMesh = ldMesh;
          defendantMesh = dMesh;
          setLoading3D(false);
        }).catch((e) => {
          console.warn('Error en inicialización de personajes 3D:', e);
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
          const isLawyerPlaintiffSpeaking = spkRole === 'abogado_demandante' || spkRole === 'fiscal';
          const isPlaintiffSpeaking = spkRole === 'demandante';
          const isLawyerDefendantSpeaking = spkRole === 'abogado_demandado' || spkRole === 'abogado_defensor';
          const isDefendantSpeaking = spkRole === 'demandado';

          // --- 8.1 MOVIMIENTO Y EXPRESIÓN DE LOS 5 PERSONAJES ---

          // 1. JUEZ (Presidencia): Inclinación solemne, asentimiento al moderar
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
              const targetY = (isLawyerPlaintiffSpeaking || isPlaintiffSpeaking) ? -0.22 : (isLawyerDefendantSpeaking || isDefendantSpeaking) ? 0.22 : 0;
              judgeMesh.rotation.y = THREE.MathUtils.lerp(judgeMesh.rotation.y, targetY, 0.04);
              judgeMesh.rotation.z = THREE.MathUtils.lerp(judgeMesh.rotation.z, 0, 0.05);
            }
          }

          // 2. ABOGADO DEMANDANTE / FISCAL: Camina fluidamente al centro de la sala
          if (lawyerPlaintiffMesh) {
            const destPos = isLawyerPlaintiffSpeaking ? speechPositions.lawyerPlaintiff : basePositions.lawyerPlaintiff;
            const dist = lawyerPlaintiffMesh.position.distanceTo(destPos);
            const isWalking = dist > 0.08;

            lawyerPlaintiffMesh.position.lerp(destPos, isWalking ? 0.04 : 0.07);

            if (isWalking) {
              // Cadencia de paso al caminar hacia el centro o de regreso a su mesa
              lawyerPlaintiffMesh.position.y = destPos.y + Math.abs(Math.sin(t * 10)) * 0.035;
              lawyerPlaintiffMesh.rotation.z = Math.sin(t * 10) * 0.03;
              const targetWalkingRot = isLawyerPlaintiffSpeaking ? 0.55 : -0.55;
              lawyerPlaintiffMesh.rotation.y = THREE.MathUtils.lerp(lawyerPlaintiffMesh.rotation.y, targetWalkingRot, 0.08);
            } else if (isLawyerPlaintiffSpeaking) {
              // En el centro del plenario: oratoria forense ante el estrado y la sala
              const targetRotationY = 0.05;
              lawyerPlaintiffMesh.rotation.y = THREE.MathUtils.lerp(lawyerPlaintiffMesh.rotation.y, targetRotationY + Math.sin(t * 2.5) * 0.06, 0.06);
              lawyerPlaintiffMesh.rotation.x = Math.sin(t * 7) * 0.04;
              lawyerPlaintiffMesh.rotation.z = Math.cos(t * 5) * 0.02;
              lawyerPlaintiffMesh.position.y = destPos.y + Math.abs(Math.sin(t * 8)) * 0.015;
            } else {
              // En su mesa: postura atenta orientada hacia el tribunal y el centro
              const targetRotationY = isJudgeSpeaking ? 0.25 : (isLawyerDefendantSpeaking || isDefendantSpeaking) ? 0.40 : 0.20;
              lawyerPlaintiffMesh.rotation.y = THREE.MathUtils.lerp(lawyerPlaintiffMesh.rotation.y, targetRotationY, 0.04);
              lawyerPlaintiffMesh.rotation.x = THREE.MathUtils.lerp(lawyerPlaintiffMesh.rotation.x, 0, 0.05);
              lawyerPlaintiffMesh.rotation.z = THREE.MathUtils.lerp(lawyerPlaintiffMesh.rotation.z, 0, 0.05);
              lawyerPlaintiffMesh.position.y = destPos.y;
            }
          }

          // 3. DEMANDANTE: Postura testimonial, atenta a su letrado y al tribunal
          if (plaintiffMesh) {
            const destPos = isPlaintiffSpeaking ? speechPositions.plaintiff : basePositions.plaintiff;
            const dist = plaintiffMesh.position.distanceTo(destPos);
            const isWalking = dist > 0.08;

            plaintiffMesh.position.lerp(destPos, isWalking ? 0.04 : 0.06);

            if (isWalking) {
              plaintiffMesh.position.y = destPos.y + Math.abs(Math.sin(t * 9)) * 0.03;
              plaintiffMesh.rotation.z = Math.sin(t * 9) * 0.025;
            } else if (isPlaintiffSpeaking) {
              const targetRotationY = 0.15;
              plaintiffMesh.rotation.y = THREE.MathUtils.lerp(plaintiffMesh.rotation.y, targetRotationY, 0.06);
              plaintiffMesh.rotation.x = Math.sin(t * 7) * 0.035;
              plaintiffMesh.rotation.z = Math.cos(t * 5) * 0.02;
              plaintiffMesh.position.y = destPos.y + Math.sin(t * 8) * 0.015;
            } else {
              const targetRotationY = isJudgeSpeaking ? 0.22 : isLawyerPlaintiffSpeaking ? 0.12 : 0.18;
              plaintiffMesh.rotation.y = THREE.MathUtils.lerp(plaintiffMesh.rotation.y, targetRotationY, 0.04);
              plaintiffMesh.rotation.x = THREE.MathUtils.lerp(plaintiffMesh.rotation.x, 0, 0.05);
              plaintiffMesh.rotation.z = THREE.MathUtils.lerp(plaintiffMesh.rotation.z, 0, 0.05);
              plaintiffMesh.position.y = destPos.y;
            }
          }

          // 4. ABOGADO DEFENSOR: Camina fluidamente al centro de la sala
          if (lawyerDefendantMesh) {
            const destPos = isLawyerDefendantSpeaking ? speechPositions.lawyerDefendant : basePositions.lawyerDefendant;
            const dist = lawyerDefendantMesh.position.distanceTo(destPos);
            const isWalking = dist > 0.08;

            lawyerDefendantMesh.position.lerp(destPos, isWalking ? 0.04 : 0.07);

            if (isWalking) {
              // Cadencia de paso al caminar hacia el centro o de regreso a su mesa
              lawyerDefendantMesh.position.y = destPos.y + Math.abs(Math.sin(t * 10)) * 0.035;
              lawyerDefendantMesh.rotation.z = Math.sin(t * 10) * 0.03;
              const targetWalkingRot = isLawyerDefendantSpeaking ? -0.55 : 0.55;
              lawyerDefendantMesh.rotation.y = THREE.MathUtils.lerp(lawyerDefendantMesh.rotation.y, targetWalkingRot, 0.08);
            } else if (isLawyerDefendantSpeaking) {
              // En el centro del plenario: oratoria de defensa y refutación
              const targetRotationY = -0.05;
              lawyerDefendantMesh.rotation.y = THREE.MathUtils.lerp(lawyerDefendantMesh.rotation.y, targetRotationY + Math.sin(t * 2.5) * 0.06, 0.06);
              lawyerDefendantMesh.rotation.x = Math.sin(t * 7.5) * 0.045;
              lawyerDefendantMesh.rotation.z = Math.cos(t * 5.5) * 0.025;
              lawyerDefendantMesh.position.y = destPos.y + Math.abs(Math.sin(t * 8)) * 0.015;
            } else {
              // En su mesa: postura atenta orientada hacia el tribunal y el centro
              const targetRotationY = isJudgeSpeaking ? -0.25 : (isLawyerPlaintiffSpeaking || isPlaintiffSpeaking) ? -0.40 : -0.20;
              lawyerDefendantMesh.rotation.y = THREE.MathUtils.lerp(lawyerDefendantMesh.rotation.y, targetRotationY, 0.04);
              lawyerDefendantMesh.rotation.x = THREE.MathUtils.lerp(lawyerDefendantMesh.rotation.x, 0, 0.05);
              lawyerDefendantMesh.rotation.z = THREE.MathUtils.lerp(lawyerDefendantMesh.rotation.z, 0, 0.05);
              lawyerDefendantMesh.position.y = destPos.y;
            }
          }

          // 5. DEMANDADO / ACUSADO: Atento a las imputaciones, interviene con compostura
          if (defendantMesh) {
            const destPos = isDefendantSpeaking ? speechPositions.defendant : basePositions.defendant;
            const dist = defendantMesh.position.distanceTo(destPos);
            const isWalking = dist > 0.08;

            defendantMesh.position.lerp(destPos, isWalking ? 0.04 : 0.06);

            if (isWalking) {
              defendantMesh.position.y = destPos.y + Math.abs(Math.sin(t * 9)) * 0.03;
              defendantMesh.rotation.z = Math.sin(t * 9) * 0.025;
            } else if (isDefendantSpeaking) {
              const targetRotationY = -0.15;
              defendantMesh.rotation.y = THREE.MathUtils.lerp(defendantMesh.rotation.y, targetRotationY, 0.06);
              defendantMesh.rotation.x = Math.sin(t * 7) * 0.035;
              defendantMesh.rotation.z = Math.cos(t * 5) * 0.025;
              defendantMesh.position.y = destPos.y + Math.sin(t * 8) * 0.015;
            } else {
              const targetRotationY = isJudgeSpeaking ? -0.22 : isLawyerDefendantSpeaking ? -0.12 : -0.18;
              defendantMesh.rotation.y = THREE.MathUtils.lerp(defendantMesh.rotation.y, targetRotationY, 0.04);
              defendantMesh.rotation.x = THREE.MathUtils.lerp(defendantMesh.rotation.x, 0, 0.05);
              defendantMesh.rotation.z = THREE.MathUtils.lerp(defendantMesh.rotation.z, 0, 0.05);
              defendantMesh.position.y = destPos.y;
            }
          }

          // --- 8.15 ONDULACIÓN SUAVE DE BANDERAS NACIONALES ---
          for (const f of animatedFlags) {
            const posAttr = f.mesh.geometry.attributes.position as THREE.BufferAttribute;
            const halfW = Math.max(0.5, f.baseX[posAttr.count - 1] || 0.75);
            for (let i = 0; i < posAttr.count; i++) {
              const bx = f.baseX[i];
              const weight = Math.max(0, (bx + halfW) / (halfW * 2));
              const wave = Math.sin(bx * 3.8 - t * 2.2 + f.phase) * 0.065 * weight;
              posAttr.setZ(i, wave);
            }
            posAttr.needsUpdate = true;
            f.mesh.geometry.computeVertexNormals();
          }

          // --- 8.2 ACTUALIZACIÓN DE SPOTLIGHT Y AURA ILUMINADA ---
          let activeSpeakerCoords = basePositions.judge;
          if (isJudgeSpeaking) activeSpeakerCoords = speechPositions.judge;
          else if (isLawyerPlaintiffSpeaking) activeSpeakerCoords = speechPositions.lawyerPlaintiff;
          else if (isPlaintiffSpeaking) activeSpeakerCoords = speechPositions.plaintiff;
          else if (isLawyerDefendantSpeaking) activeSpeakerCoords = speechPositions.lawyerDefendant;
          else if (isDefendantSpeaking) activeSpeakerCoords = speechPositions.defendant;

          spotTarget.position.lerp(activeSpeakerCoords, 0.06);
          speakerSpotlight.position.set(activeSpeakerCoords.x * 0.5, 8.5, activeSpeakerCoords.z + 3.2);

          speakerAura.position.x = activeSpeakerCoords.x;
          speakerAura.position.z = activeSpeakerCoords.z;
          const auraPulse = 0.5 + Math.sin(t * 5) * 0.35;
          auraMat.opacity = isSpeakingAudioRef.current ? auraPulse : 0.45;
          speakerAura.rotation.z = t * 0.5;

          // --- 8.3 AUTO-DIRECTOR: SEGUIMIENTO CINEMATOGRÁFICO DE CÁMARA ---
          if (activePresetRef.current === 'auto') {
            if (isJudgeSpeaking) {
              targetCamPos.set(0, 2.2, -2.5);
              targetCamLook.set(0, 2.0, -5.7);
            } else if (isLawyerPlaintiffSpeaking) {
              targetCamPos.set(-0.35, 1.8, 0.8);
              targetCamLook.set(-0.35, 1.4, -2.3);
            } else if (isLawyerDefendantSpeaking) {
              targetCamPos.set(0.35, 1.8, 0.8);
              targetCamLook.set(0.35, 1.4, -2.3);
            } else if (isPlaintiffSpeaking) {
              targetCamPos.set(-1.0, 1.7, 0.0);
              targetCamLook.set(-1.4, 1.3, -2.6);
            } else if (isDefendantSpeaking) {
              targetCamPos.set(1.0, 1.7, 0.0);
              targetCamLook.set(1.4, 1.3, -2.6);
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
          <span>Órgano Judicial de Bolivia • Sala Nº 1</span>
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
        {/* Toggle de Iluminación de Sala */}
        <button
          onClick={() => setBrightLighting(!brightLighting)}
          className={`p-2 rounded-xl border backdrop-blur-md transition-all shadow-md flex items-center space-x-1.5 text-xs font-semibold cursor-pointer ${
            brightLighting
              ? 'bg-[#14263D]/90 border-[#C5A15B]/50 text-[#C5A15B]'
              : 'bg-[#14263D]/80 border-[#243F5B] text-slate-300 hover:text-white'
          }`}
          title={brightLighting ? 'Iluminación Clara' : 'Iluminación Suave'}
        >
          {brightLighting ? <Sun className="w-4 h-4 text-[#C5A15B]" /> : <Moon className="w-4 h-4 text-slate-400" />}
          <span className="hidden sm:inline">{brightLighting ? 'Luz Clara' : 'Luz Suave'}</span>
        </button>

        {/* Selector de Ángulos de Cámara */}
        <div className="flex items-center space-x-1 bg-[#14263D]/90 backdrop-blur-md p-1 rounded-xl border border-[#243F5B] shadow-lg">
          <button
            onClick={() => handleSelectPreset('auto')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activePreset === 'auto'
                ? 'bg-[#C5A15B] text-[#14263D] shadow-sm font-bold'
                : 'text-slate-200 hover:text-white hover:bg-[#243F5B]'
            }`}
            title="Auto-director procesal: enfoca automáticamente al orador activo"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Enfoque Automático</span>
          </button>

          <button
            onClick={() => handleSelectPreset('general')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activePreset === 'general'
                ? 'bg-[#C5A15B] text-[#14263D] shadow-sm font-bold'
                : 'text-slate-200 hover:text-white hover:bg-[#243F5B]'
            }`}
            title="Vista panorámica de la Sala"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Sala General</span>
          </button>

          <button
            onClick={() => handleSelectPreset('judge')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activePreset === 'judge'
                ? 'bg-[#C5A15B] text-[#14263D] shadow-sm font-bold'
                : 'text-slate-200 hover:text-white hover:bg-[#243F5B]'
            }`}
            title="Estrado del Tribunal / Magistrado"
          >
            <Scale className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Tribunal</span>
          </button>

          <button
            onClick={() => handleSelectPreset('plaintiff')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activePreset === 'plaintiff'
                ? 'bg-[#C5A15B] text-[#14263D] shadow-sm font-bold'
                : 'text-slate-200 hover:text-white hover:bg-[#243F5B]'
            }`}
            title="Mesa de la Acusación"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Acusación</span>
          </button>

          <button
            onClick={() => handleSelectPreset('defendant')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activePreset === 'defendant'
                ? 'bg-[#C5A15B] text-[#14263D] shadow-sm font-bold'
                : 'text-slate-200 hover:text-white hover:bg-[#243F5B]'
            }`}
            title="Mesa de la Defensa"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Defensa</span>
          </button>

          <button
            onClick={() => handleSelectPreset('first_person')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activePreset === 'first_person'
                ? 'bg-[#C5A15B] text-[#14263D] shadow-sm font-bold'
                : 'text-slate-200 hover:text-white hover:bg-[#243F5B]'
            }`}
            title="Perspectiva subjetiva desde tu posición procesal"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mi Posición</span>
          </button>
        </div>
      </div>

      {/* Guía de Controles y Navegación Libre */}
      <div className="absolute bottom-3 left-3 bg-[#14263D]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#243F5B] text-[11px] text-slate-300 pointer-events-none z-10 flex items-center space-x-3 shadow-lg">
        <span><strong>W/A/S/D</strong>: Desplazamiento</span>
        <span>•</span>
        <span><strong>Q/E</strong>: Altura</span>
        <span>•</span>
        <span><strong>Arrastrar</strong>: Orbitar 360°</span>
        <span>•</span>
        <span><strong>Rueda</strong>: Distancia focal</span>
      </div>
    </div>
  );
};
