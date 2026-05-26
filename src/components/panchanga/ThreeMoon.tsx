'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreeMoonProps {
  exactPhase: number; // 0 = new moon, 0.5 = quarter, 1 = full moon
  isShukla: boolean;   // true = waxing, false = waning
}

export default function ThreeMoon({ exactPhase, isShukla }: ThreeMoonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 1. Initial Scene Setup (runs once on mount)
  useEffect(() => {
    // WebGL Support check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch (e) {
      setWebglSupported(false);
      return;
    }

    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Setup Three.js Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 2.5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color space mapping for bright textures

    // Geometry & Material
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const moonTexture = textureLoader.load(
      '/images/moon-texture.jpg',
      () => {
        setIsLoaded(true); // Smooth fade-in once texture is ready
      }
    );
    moonTexture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
      map: moonTexture,
      bumpMap: moonTexture,
      bumpScale: 0.04,
      roughness: 0.80,
      metalness: 0.05,
    });

    const moonMesh = new THREE.Mesh(geometry, material);
    moonMesh.rotation.x = 0.12; 
    scene.add(moonMesh);

    // Lighting - Adjusted for realistic physical rendering without overexposure
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02); // Deep space is dark
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8); // Realistic intensity
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Initial light positioning
    let initialVisualPhase = exactPhase;
    if (exactPhase > 0.5) {
      initialVisualPhase = 1 - Math.pow(1 - exactPhase, 0.7);
    } else if (exactPhase < 0.5) {
      initialVisualPhase = Math.pow(exactPhase, 0.7);
    }
    const initialAngle = (isShukla ? 1 : -1) * Math.acos(2 * initialVisualPhase - 1);
    const lx = Math.sin(initialAngle);
    const lz = Math.cos(initialAngle);
    sunLight.position.set(lx, 0, lz).normalize().multiplyScalar(5);

    // Responsive Resizing
    const resizeCanvas = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height, false);
    };

    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    // Animation & Visibility Control
    let animationFrameId: number;
    let isVisible = true;

    const animate = () => {
      if (!isVisible) return;
      animationFrameId = requestAnimationFrame(animate);
      moonMesh.rotation.y += 0.0001; // Slower, majestic rotation
      renderer.render(scene, camera);
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            animate();
          } else {
            cancelAnimationFrame(animationFrameId);
          }
        });
      },
      { threshold: 0.1 }
    );
    intersectionObserver.observe(canvas);

    animate();

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      
      geometry.dispose();
      material.dispose();
      moonTexture.dispose();
      renderer.dispose();
      sunLightRef.current = null;
    };
  }, []); // Run only on mount

  // 2. Dynamic lighting update (runs whenever exactPhase or isShukla changes)
  useEffect(() => {
    if (!sunLightRef.current) return;
    const sunLight = sunLightRef.current;
    
    // Visual correction: WebGL sRGB gamma correction makes the shadow terminator look squished to the edge.
    // We apply a power curve to exactPhase to pull the terminator visually towards the center.
    let visualPhase = exactPhase;
    if (exactPhase > 0.5) {
      visualPhase = 1 - Math.pow(1 - exactPhase, 0.7);
    } else if (exactPhase < 0.5) {
      visualPhase = Math.pow(exactPhase, 0.7);
    }
    
    const angle = (isShukla ? 1 : -1) * Math.acos(2 * visualPhase - 1);
    const lx = Math.sin(angle);
    const lz = Math.cos(angle);
    
    sunLight.position.set(lx, 0, lz).normalize().multiplyScalar(5);
  }, [exactPhase, isShukla]);

  if (!webglSupported) {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full relative flex items-center justify-center transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block touch-none"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
}
