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

import * as three from "three";
import * as san from "san";

/**
 * @param {HTMLElement} mod_root_elem
 * @param {*} graph
 * @param {*} config
 */
function render_graph(mod_root_elem, graph, config) {
  const mod_root_elem_id = mod_root_elem.id;

  const scene = new three.Scene();

  const camera = new three.PerspectiveCamera(75, 1.0, 0.01, 10);
  if (config.camera_param != undefined) {
    san.set_perspective_camera_from_param(camera, config.camera_param);
  } else {
    camera.position.z = 2.0;
  }

  const pos_list = graph.position.data;

  let Dim = graph.position.dim;
  const size = pos_list.length / Dim;

  let pos_arr = new Float32Array(size * 3);
  if (Dim == 2) {
    for (let i = 0; i < size; ++i) {
      const i2 = i * 2;
      const i3 = i * 3;
      pos_arr[i3] = pos_list[i2];
      pos_arr[i3 + 1] = pos_list[i2 + 1];
    }
  } else {
    for (let i = 0; i < size; ++i) {
      const id = i * Dim;
      const i3 = i * 3;
      pos_arr[i3] = pos_list[id];
      pos_arr[i3 + 1] = pos_list[id + 1];
      pos_arr[i3 + 2] = pos_list[id + 2];
    }
  }
  const pos_att = new three.BufferAttribute(pos_arr, 3);
  const geometry = new three.BufferGeometry();
  geometry.setAttribute("position", pos_att);
  geometry.setIndex(graph.index);
  const material = new three.LineBasicMaterial({ color: 0xdb2777 });
  const obj = new three.LineSegments(geometry, material);
  scene.add(obj);

  const target_elem = document.createElement("div");
  target_elem.className = "graph_canvas";
  mod_root_elem.insertAdjacentElement("afterbegin", target_elem);

  const control = new three.OrbitControls(camera, target_elem);

  if (config.orbit_ctrl_param != undefined) {
    san.set_orbit_ctrl_from_param(control, config.orbit_ctrl_param);
  } else {
    control.autoRotate = true;
    control.autoRotateSpeed = 0.5;
  }

  let last_update = Date.now();
  const scene_info = new san.SceneInfo(target_elem, scene, camera, () => {
    let now = Date.now();
    control.update((now - last_update) / 1000);
    last_update = now;
  });

  const san_context = window.mdbook.san_context;
  const curr_scene_info_i = san_context.add(scene_info);

  san_context.prepare_fullscreen([curr_scene_info_i], mod_root_elem);
}

/**
 *
 * @param {string} id_string
 * @param {{
 *  load: string[]
 * }} curr_data
 */
export function render(id_string, curr_data) {
  const mod_root_html_elem = document.getElementById(id_string);
  if (
    curr_data.load == undefined ||
    curr_data.load.length == undefined ||
    curr_data.load.length <= 0
  ) {
    return;
  }

  const res = window.mdbook.fetch_static_json_helper(curr_data.load[0]);

  if (res.data != undefined) {
    render_graph(mod_root_html_elem, res.data, curr_data);
  } else {
    res.promise.then((graph) => {
      render_graph(mod_root_html_elem, graph, curr_data);
    });
  }
}

export function print() {
  return "lala";
}
