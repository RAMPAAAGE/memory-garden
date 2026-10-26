import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * Dreamy lens: the foreground (bottom of the frame) and the sky melt into a soft blur while the
 * middle band stays in focus, plus a gentle grade that lifts the blacks and softens contrast.
 */
export function createSoftPass(): ShaderPass {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uBlur: { value: 7.0 },
      uLift: { value: new THREE.Color('#0b1512') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uBlur;
      uniform vec3 uLift;
      varying vec2 vUv;
      const vec2 taps[12] = vec2[](
        vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
        vec2(0.962, -0.195), vec2(0.473, -0.480), vec2(0.519, 0.767), vec2(0.185, -0.893),
        vec2(0.507, 0.064), vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598));
      void main() {
        // focus band sits where the memories float; blur grows toward the bottom and the top
        float near = 1.0 - smoothstep(0.0, 0.4, vUv.y);
        float far = smoothstep(0.78, 1.0, vUv.y) * 0.5;
        float side = smoothstep(0.62, 1.0, abs(vUv.x - 0.5) * 2.0) * 0.55;   // soft mask toward the left/right edges
        float r = (near * near + far + side * side) * uBlur;
        vec4 c = texture2D(tDiffuse, vUv);
        if (r > 0.3) {
          vec2 px = r / uResolution;
          vec4 acc = c;
          for (int i = 0; i < 12; i++) acc += texture2D(tDiffuse, vUv + taps[i] * px);
          c = acc / 13.0;
        }
        vec3 col = c.rgb;
        // soft grade: slightly desaturated, lifted blacks, gentle highlight roll-off
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, 0.92);
        col = col * 0.93 + uLift * (1.0 - smoothstep(0.0, 0.5, l));
        col = col / (1.0 + max(col - 0.85, 0.0) * 0.6);
        gl_FragColor = vec4(col, c.a);
      }`,
  });
}
