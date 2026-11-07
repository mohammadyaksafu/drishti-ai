import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * The hero's 3D backdrop: an endless road through a wireframe landscape,
 * flowing toward the viewer. Hazards appear on the road as glowing beacons and
 * get a bounding box the moment they cross the AI "scan line", which is the
 * product's story told without words.
 *
 * Plain three.js (no react-three-fiber) keeps the chunk small and the render
 * loop under our control: it pauses off-screen and renders a single still
 * frame for visitors who prefer reduced motion.
 */

const SPEED = 6; // world units per second the road travels
const SPAN = 90; // distance over which beacons recycle
const SCAN_Z = -22; // where the AI scan line sits

const SEVERITY = [0xdc2626, 0xea580c, 0xf59e0b, 0x16a34a, 0xdc2626, 0xf59e0b];

const groundVertex = /* glsl */ `
  uniform float uTime;
  varying vec2 vWorld;
  varying float vElev;
  varying float vDepth;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    vec3 p = position;
    float wz = p.z - uTime * ${SPEED.toFixed(1)};
    // Flat road in the middle, hills rising either side.
    float shoulder = smoothstep(4.5, 11.0, abs(p.x));
    float h = noise(vec2(p.x * 0.10, wz * 0.10)) * 5.0 + noise(vec2(p.x * 0.35, wz * 0.35)) * 1.0;
    p.y += h * shoulder;
    vWorld = vec2(p.x, wz);
    vElev = h * shoulder;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const groundFragment = /* glsl */ `
  varying vec2 vWorld;
  varying float vElev;
  varying float vDepth;

  float gridLine(vec2 coord) {
    vec2 g = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    float ax = abs(vWorld.x);
    float fade = smoothstep(95.0, 8.0, vDepth);

    // Paddy-field greens, brighter on the hill tops.
    vec3 deep = vec3(0.0, 0.52, 0.36);
    vec3 bright = vec3(0.45, 0.92, 0.64);
    vec3 col = mix(deep, bright, clamp(vElev / 5.0, 0.0, 1.0));
    float alpha = gridLine(vWorld / 2.0) * 0.55;

    // Road surface, its edge lines and the dashed centre line.
    float road = 1.0 - smoothstep(3.2, 3.4, ax);
    float edge = (1.0 - smoothstep(0.04, 0.1, abs(ax - 3.0))) ;
    float dash = (1.0 - smoothstep(0.05, 0.1, ax)) * step(fract(vWorld.y / 5.0), 0.55);

    col = mix(col, vec3(0.05, 0.10, 0.08), road * 0.9);
    alpha = mix(alpha, 0.85, road);
    col = mix(col, vec3(0.85, 1.0, 0.92), edge);
    alpha = max(alpha, edge * 0.9);
    col = mix(col, vec3(0.99, 0.90, 0.54), dash);
    alpha = max(alpha, dash);

    gl_FragColor = vec4(col, alpha * fade);
  }
`;

function dotTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export default function HeroScene({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return undefined; // No WebGL: the CSS gradient behind stays as the backdrop.
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 260);
    const lookTarget = new THREE.Vector3(0, 0.5, -30);
    camera.position.set(0, 3.6, 10);

    const disposables = [];
    const track = (o) => (disposables.push(o), o);

    // ---------------------------------------------------------- landscape
    const groundGeo = track(new THREE.PlaneGeometry(90, 130, 180, 260));
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.translate(0, 0, -50);
    const groundMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: groundVertex,
        fragmentShader: groundFragment,
        transparent: true,
        depthWrite: false,
      })
    );
    scene.add(new THREE.Mesh(groundGeo, groundMat));

    // ------------------------------------------------------------ beacons
    const ringGeo = track(new THREE.RingGeometry(0.42, 0.6, 40));
    ringGeo.rotateX(-Math.PI / 2);
    const beamGeo = track(new THREE.CylinderGeometry(0.035, 0.035, 5, 8, 1, true));
    beamGeo.translate(0, 2.5, 0);
    const boxGeo = track(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 0.9, 1.7)));
    boxGeo.translate(0, 0.45, 0);
    const coreGeo = track(new THREE.SphereGeometry(0.16, 16, 12));

    const beacons = SEVERITY.map((color, i) => {
      const group = new THREE.Group();
      const mk = (geo, opts, Kind = THREE.Mesh) => {
        const mat = track(
          new (Kind === THREE.LineSegments ? THREE.LineBasicMaterial : THREE.MeshBasicMaterial)({
            color,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            ...opts,
          })
        );
        const obj = new Kind(geo, mat);
        group.add(obj);
        return obj;
      };
      const ring = mk(ringGeo, { opacity: 0.9 });
      const pulse = mk(ringGeo, { opacity: 0.6 });
      const beam = mk(beamGeo, { opacity: 0.45 });
      const core = mk(coreGeo, { opacity: 1 });
      core.position.y = 0.2;
      const box = mk(boxGeo, { opacity: 0 }, THREE.LineSegments);
      scene.add(group);
      return {
        group, ring, pulse, beam, core, box,
        x: (i % 2 ? 1 : -1) * (0.8 + ((i * 37) % 17) / 10),
        offset: (i / SEVERITY.length) * SPAN,
      };
    });

    // ------------------------------------------- the red sun of the flag
    const sunMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime; varying vec2 vUv;
          void main(){
            float d = distance(vUv, vec2(0.5));
            float disc = 1.0 - smoothstep(0.235, 0.245, d);
            float halo = pow(max(0.0, 1.0 - d * 2.0), 2.5) * 0.55;
            // Horizontal bands sliding down, a nod to the classic horizon sun.
            float bands = step(0.5, fract(vUv.y * 14.0 + uTime * 0.25)) ;
            float cut = vUv.y < 0.42 ? bands : 1.0;
            vec3 red = vec3(0.96, 0.16, 0.25);
            gl_FragColor = vec4(red, disc * cut * 0.95 + halo * 0.6);
          }`,
      })
    );
    const sunGeo = track(new THREE.PlaneGeometry(60, 60));
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 9, -120);
    sun.renderOrder = -1;
    scene.add(sun);

    // ----------------------------------------------------------- scan line
    const scanMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xf42a41,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const scanGeo = track(new THREE.PlaneGeometry(8, 0.08));
    const scan = new THREE.Mesh(scanGeo, scanMat);
    scan.rotation.x = -Math.PI / 2;
    scan.position.set(0, 0.05, SCAN_Z);
    scene.add(scan);

    const curtainMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime; varying vec2 vUv;
          void main(){
            float a = pow(1.0 - vUv.y, 2.2) * 0.35;
            a *= 0.75 + 0.25 * sin(uTime * 3.0 + vUv.x * 12.0);
            a *= smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
            gl_FragColor = vec4(0.96, 0.17, 0.25, a);
          }`,
      })
    );
    const curtainGeo = track(new THREE.PlaneGeometry(8, 2.6));
    curtainGeo.translate(0, 1.3, 0);
    const curtain = new THREE.Mesh(curtainGeo, curtainMat);
    curtain.position.set(0, 0, SCAN_Z);
    scene.add(curtain);

    // ---------------------------------------------------------- particles
    const COUNT = 700;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = [new THREE.Color(0x3fbe88), new THREE.Color(0x78d8ac), new THREE.Color(0xaeeacb), new THREE.Color(0xff5a6e)];
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 18;
      positions[i * 3 + 2] = -Math.random() * 90 + 10;
      const c = palette[i % palette.length];
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const dustTex = track(dotTexture());
    const dustMat = track(
      new THREE.PointsMaterial({
        size: 0.22,
        map: dustTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ------------------------------------------------------ interaction
    const pointer = { x: 0, y: 0 };
    const onPointer = (e) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      // On narrow screens pull back so the road still reads.
      camera.fov = w < 640 ? 68 : 55;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // ------------------------------------------------------------- loop
    const clock = new THREE.Clock();
    let frame = 0;
    let visible = true;

    const renderAt = (t) => {
      groundMat.uniforms.uTime.value = t;
      curtainMat.uniforms.uTime.value = t;
      sunMat.uniforms.uTime.value = t;

      beacons.forEach((b, i) => {
        // Same speed as the shader so beacons stay glued to the road.
        const z = -80 + ((b.offset + t * SPEED) % SPAN);
        b.group.position.set(b.x, 0.02, z);
        const appear = THREE.MathUtils.smoothstep(z, -80, -60) * (1 - THREE.MathUtils.smoothstep(z, 4, 9));
        const detected = THREE.MathUtils.smoothstep(z, SCAN_Z - 0.5, SCAN_Z + 2.5);
        const p = (t * 0.9 + i * 0.37) % 1;
        b.pulse.scale.setScalar(1 + p * 2.2);
        b.pulse.material.opacity = (1 - p) * 0.6 * appear;
        b.ring.material.opacity = 0.9 * appear;
        b.core.material.opacity = appear;
        b.beam.material.opacity = (0.15 + detected * 0.45) * appear;
        b.box.material.opacity = detected * appear;
        b.box.scale.setScalar(0.6 + detected * 0.4);
        b.box.rotation.y = (1 - detected) * 0.8;
      });

      const pos = dustGeo.attributes.position.array;
      for (let i = 0; i < COUNT; i += 1) {
        pos[i * 3 + 1] += 0.004;
        pos[i * 3 + 2] += 0.02;
        if (pos[i * 3 + 1] > 18) pos[i * 3 + 1] = 0;
        if (pos[i * 3 + 2] > 12) pos[i * 3 + 2] = -80;
      }
      dustGeo.attributes.position.needsUpdate = true;

      scanMat.opacity = 0.45 + Math.sin(t * 6) * 0.2;

      camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.04;
      camera.position.y += (3.6 - pointer.y * 0.8 - camera.position.y) * 0.04;
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      renderAt(clock.getElapsedTime());
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(mount);

    if (reduceMotion) renderAt(4.2);
    else tick();

    // Fade in once the first frame is drawn so the canvas never "pops".
    requestAnimationFrame(() => mount.classList.add('opacity-100'));

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`opacity-0 transition-opacity duration-1000 ${className}`}
      aria-hidden="true"
    />
  );
}
