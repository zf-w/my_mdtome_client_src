/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Zhifeng's Markdown To Website Renderer
 * Copyright (C) 2024  Zhifeng Wang 王之枫
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3 of the License only.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as Three from "three";
import { SceneInfo } from "san";

function generate_galaxy_object(parameters) {
  const geometry = new Three.BufferGeometry();

  const randomness = new Float32Array(parameters.count * 3);
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const scales = new Float32Array(parameters.count * 1);

  const inside_color = new Three.Color(parameters.inside_color);
  const outside_color = new Three.Color(parameters.outside_color);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;

    // Position
    const radius = Math.random() * parameters.radius;

    const branchAngle =
      ((i % parameters.branches) / parameters.branches) * Math.PI * 2;

    const randomFactor =
      parameters.radius - Math.abs(radius - parameters.radius / 2) * 2;
    const randomX =
      Math.pow(Math.random(), parameters.randomness_power) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness; // * radius
    const randomY =
      Math.pow(Math.random(), parameters.randomness_power) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness; // * radius
    const randomZ =
      Math.pow(Math.random(), parameters.randomness_power) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness; // * radius

    positions[i3] = Math.cos(branchAngle) * radius;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = Math.sin(branchAngle) * radius;

    // Color
    const mixedColor = inside_color.clone();
    mixedColor.lerp(outside_color, Math.pow(radius / parameters.radius, 0.5));

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    randomness[i3] = randomX * randomFactor;
    randomness[i3 + 1] = randomY * 0.5 * randomFactor;
    randomness[i3 + 2] = randomZ * randomFactor;

    scales[i] = Math.random();
  }

  geometry.setAttribute("position", new Three.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Three.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new Three.BufferAttribute(scales, 1));
  geometry.setAttribute(
    "aRandomness",
    new Three.BufferAttribute(randomness, 3)
  );

  /**
   * Material
   */
  const material = new Three.ShaderMaterial({
    depthWrite: false,
    blending: Three.AdditiveBlending,
    vertexColors: true,
    vertexShader: `
  uniform float uSize;
  uniform float uTime;
  attribute float aScale;
  attribute vec3 aRandomness;
  varying vec3 vColor;
  
  
  void main()
  {
      /**
       * Position
       */
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      
  
      float angle = atan(modelPosition.x, modelPosition.z);
      float distanceToCenter = length(modelPosition.xz);
      float angleOffset = (0.2 / distanceToCenter) * uTime;
      angle += angleOffset;
      modelPosition.x = cos(angle);
      modelPosition.z = sin(angle);
      modelPosition.xz *= distanceToCenter;
      modelPosition.xyz += aRandomness;
  
      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectedPosition = projectionMatrix * viewPosition;
      gl_Position = projectedPosition;
      /**
       * Size
       */
  
      gl_PointSize = uSize * aScale;
      gl_PointSize *= (1.0 / - viewPosition.z);
      vColor = color;
  }`,
    fragmentShader: `
  varying vec3 vColor;
  
  void main()
  {
      vec3 color = mix(vec3(0.0), vColor, 1.0);
      gl_FragColor = vec4(color, 1.0);
  }`,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 8 },
    },
  });
  /**
   * Points
   */
  return [geometry, material];
}

function is_element_in_viewport(elem) {
  const bounding_box = elem.getBoundingClientRect();
  return bounding_box.bottom >= 0 && bounding_box.top <= window.innerHeight;
}
/**
 *
 * @param {*} elem_id
 * @param {{
 * galaxy_param:
 * {count: 3,radius: 5,branches: 3,randomness: 0.2,randomness_power: 3,inside_color: "#ff6030",outside_color: "#1b3984"}
 * }} data
 * @returns
 */
export function render(elem_id, data) {
  let galaxy_param = {
    count: 20000,
    radius: 5,
    branches: 3,
    randomness: 0.2,
    randomness_power: 3,
    inside_color: "#ff6030",
    outside_color: "#1b3984",
  };

  let camera_param = {
    position: {
      x: 3,
      y: 4,
      z: 4,
    },
  };

  let control_param = {
    auto_rotate_speed: 0.01,
  };

  Object.assign(galaxy_param, data.galaxy_param);
  Object.assign(camera_param, data.camera_param);
  Object.assign(control_param, data.control_param);

  const scene = new Three.Scene();
  const camera = new Three.PerspectiveCamera(75, 1, 0.1, 100);

  camera.position.x = camera_param.position.x;
  camera.position.y = camera_param.position.y;
  camera.position.z = camera_param.position.z;

  scene.add(camera);

  const [geometry, material] = generate_galaxy_object(galaxy_param);

  const object = new Three.Points(geometry, material);

  scene.add(object);

  const elem = document.getElementById(elem_id);

  const control = new Three.OrbitControls(camera, elem);
  control.enableZoom = false;
  control.enablePan = false;
  control.autoRotate = true;
  control.autoRotateSpeed = control_param.auto_rotate_speed;
  const start_time = Date.now();
  let last_update_time = start_time;
  const update = () => {
    let now = Date.now();
    const elapsed_time = (now - last_update_time) / 1000;

    if (is_element_in_viewport(elem)) {
      // @ts-ignore
      material.uniforms.uTime.value = 20 + (now - start_time) / 700;
      control.update(elapsed_time);
    }

    last_update_time = now;
  };

  const scene_info = new SceneInfo(elem, scene, camera, update);

  const scene_id = window.mdtome.san_context.add(scene_info);

  return () => {
    console.log(`Removing ${scene_id} Three Elem`);
    control.dispose();
    geometry.dispose();
    material.dispose();
    test.keep = false;
  };
}
