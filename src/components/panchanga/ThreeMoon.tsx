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
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  useEffect(() => {
    // 1. WebGL Support check
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

    // 2. Setup Three.js Scene
    const scene = new THREE.Scene();

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 2.5; // Place camera in front

    // 4. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // Transparent background to blend with page gradient
      powerPreference: 'low-power', // Save battery
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio to 2 for performance

    // 5. Geometry & Material
    // Create sphere. 64x64 segments is highly detailed but lightweight
    const geometry = new THREE.SphereGeometry(1, 64, 64);

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();
    
    // Load local textures
    const moonTexture = textureLoader.load('/images/moon-texture.jpg');
    // Using the same texture as a bump map gives excellent results for moon craters
    moonTexture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
      map: moonTexture,
      bumpMap: moonTexture,
      bumpScale: 0.04, // Subtle depth for craters
      roughness: 0.95, // Moon is very dusty and diffuse
      metalness: 0.05,
    });

    const moonMesh = new THREE.Mesh(geometry, material);
    // Slightly tilt the moon on its axis for realism (about 6.7 degrees tilt + orbit inclination)
    moonMesh.rotation.x = 0.12; 
    scene.add(moonMesh);

    // 6. Lighting
    // Ambient light - represents subtle space glow/earthshine, so dark side isn't pitch black
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
    scene.add(ambientLight);

    // Directional light - represents the Sun
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    scene.add(sunLight);

    // Position Sun according to lunar phase
    // Phase 0 = New Moon, Phase 1 = Full Moon
    // angle goes from -PI (new moon) to 0 (full moon) to PI (new moon)
    // Shukla (waxing): light comes from the right (positive X)
    // Krishna (waning): light comes from the left (negative X)
    const angle = (isShukla ? 1 : -1) * Math.acos(2 * exactPhase - 1);
    const lx = Math.sin(angle);
    const lz = Math.cos(angle);
    
    sunLight.position.set(lx, 0, lz).normalize().multiplyScalar(5);

    // 7. Responsive Resizing
    const resizeCanvas = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height, false);
    };

    // Initial resize
    resizeCanvas();
    
    // Resize observer to watch container size changes
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    // 8. Animation & Visibility Control (Intersection Observer)
    let animationFrameId: number;
    let isVisible = true;

    const animate = () => {
      if (!isVisible) return;

      animationFrameId = requestAnimationFrame(animate);

      // Very slow rotation of the moon (approx. 1 full turn in 2.5 minutes)
      moonMesh.rotation.y += 0.0007;

      renderer.render(scene, camera);
    };

    // Intersection Observer to stop rendering when off-screen
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

    // Start animation loop initially
    animate();

    // 9. Cleanup
    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      
      // Dispose WebGL resources
      geometry.dispose();
      material.dispose();
      moonTexture.dispose();
      renderer.dispose();
    };
  }, [exactPhase, isShukla]);

  if (!webglSupported) {
    // If WebGL is not supported, return null so parent component renders fallback 2D Moon
    return null;
  }

  return (
    <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block touch-none"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
}
