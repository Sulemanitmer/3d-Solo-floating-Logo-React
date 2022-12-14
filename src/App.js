import * as THREE from 'three'
import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, SSAO, SMAA } from '@react-three/postprocessing'
import { Reflector, ContactShadows, useTexture } from '@react-three/drei'
import { EdgeDetectionMode } from 'postprocessing'
import { a, useTransition, useSpring } from '@react-spring/three'
import { Badge } from '@pmndrs/branding'
import create from 'zustand'

const useStore = create((set) => {
  new THREE.FontLoader().load('/helvetiker_regular.typeface.json', (font) => {
    const config = { font, size: 8, height: 2, curveSegments: 4, evelEnabled: false }
    set({
      items: [
        { position: [0.25, 1.8, -6], r: 0.5, geometry: new THREE.SphereBufferGeometry(1, 32, 32) },
        { position: [-1.5, 0, 2], r: 0.2, geometry: new THREE.TetrahedronBufferGeometry(2) },
        { position: [1, -0.75, 4], r: 0.3, geometry: new THREE.CylinderBufferGeometry(0.8, 0.8, 2, 32) },
        { position: [-0.7, 0.5, 6], r: 0.4, geometry: new THREE.ConeGeometry(1.1, 1.7, 32) },
        { position: [0.5, -1.2, -6], r: 0.9, geometry: new THREE.SphereBufferGeometry(1.5, 32, 32) },
        { position: [-0.5, 2.5, -2], r: 0.6, geometry: new THREE.IcosahedronBufferGeometry(2) },
        { position: [-0.8, -0.75, 3], r: 0.35, geometry: new THREE.TorusBufferGeometry(1.1, 0.35, 16, 32) },
        { position: [1.5, 0.5, -2], r: 0.8, geometry: new THREE.OctahedronGeometry(2) },
        { position: [-1, -0.5, -6], r: 0.5, geometry: new THREE.SphereBufferGeometry(1.5, 32, 32) },
        { position: [1, 1.9, -1], r: 0.2, geometry: new THREE.BoxBufferGeometry(2.5, 2.5, 2.5) },
        { position: [-5, -2, -10], r: 0, geometry: new THREE.TextGeometry('SO/O', config) }
      ]
    })
  })
  return { items: [], material: new THREE.MeshStandardMaterial() }
})

function Geometry({ r, position, ...props }) {
  const ref = useRef()
  useFrame((state) => {
    ref.current.rotation.x = ref.current.rotation.y = ref.current.rotation.z += 0.004 * r
    ref.current.position.y = position[1] + Math[r > 0.5 ? 'cos' : 'sin'](state.clock.getElapsedTime() * r) * r
  })
  return (
    <group position={position} ref={ref}>
      <a.mesh {...props} />
    </group>
  )
}

function Geometries() {
  const { items, material } = useStore()
  const transition = useTransition(items, {
    from: { scale: [0, 0, 0], rotation: [0, 0, 0] },
    enter: ({ r }) => ({ scale: [1, 1, 1], rotation: [r * 3, r * 3, r * 3] }),
    leave: { scale: [0.1, 0.1, 0.1], rotation: [0, 0, 0] },
    config: { mass: 5, tension: 1000, friction: 100 },
    trail: 100
  })
  return transition((props, { position: [x, y, z], r, geometry }) => (
    <Geometry position={[x * 3, y * 3, z]} material={material} geometry={geometry} r={r} {...props} />
  ))
}

function Rig() {
  const { camera, mouse } = useThree()
  const vec = new THREE.Vector3()
  return useFrame(() => camera.position.lerp(vec.set(mouse.x * 2, mouse.y * 1, camera.position.z), 0.02))
}

function Ground() {
  const [floor, normal] = useTexture(['/SurfaceImperfections003_1K_var1.jpg', '/SurfaceImperfections003_1K_Normal.jpg'])
  return (
    <Reflector
      blur={[400, 100]}
      resolution={512}
      args={[10, 10]}
      mirror={0.5}
      mixBlur={6}
      mixStrength={1.5}
      rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      {(Material, props) => (
        <Material color="#000000" metalness={0.4} roughnessMap={floor} normalMap={normal} normalScale={[2, 2]} {...props} />
      )}
    </Reflector>
  )
}

export default function App() {
  const { color } = useSpring({ color: 0, from: { color: 1 }, config: { friction: 50 }, loop: true })
  return (
    <>
      <Canvas
        concurrent
        gl={{ powerPreference: 'high-performance', antialias: false, stencil: false, depth: false, alpha: false }}
        pixelRatio={1.25}
        camera={{ position: [0, 0, 15], near: 5, far: 40 }}>
        <color attach="background" args={['white']} />
        <a.fog attach="fog" args={['white', 10, 40]} color={color.to([0, 0.2, 0.4, 0.7, 1], ['white', 'blue', 'white', 'blue', 'white'])} />
        <ambientLight intensity={0.8} />
        <directionalLight castShadow position={[2.5, 12, 12]} intensity={4} />
        <pointLight position={[20, 20, 20]} />
        <pointLight position={[-20, -20, -20]} intensity={5} />
        <Suspense fallback={null}>
          <Geometries />
          <ContactShadows rotation={[Math.PI / 2, 0, 0]} position={[0, -7, 0]} opacity={0.75} width={40} height={40} blur={1} far={9} />
          <EffectComposer multisampling={0}>
            <SSAO samples={25} intensity={40} luminanceInfluence={0.5} radius={10} scale={0.5} bias={0.5} />
            <SMAA edgeDetectionMode={EdgeDetectionMode.DEPTH} />
          </EffectComposer>
        </Suspense>
        <Rig />
      </Canvas>
      <Badge />
    </>
  )
}
