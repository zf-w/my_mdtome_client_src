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
 *
 * @param {number[][]} adj_list
 */
function make_index_edge_list_from_adj_list(adj_list) {
  const vertex_num = adj_list.length;
  const ans_list = [];
  for (let node_i = 0; node_i < vertex_num; ++node_i) {
    const nexts = adj_list[node_i];
    for (let next_i = 0; next_i < nexts.length; ++next_i) {
      ans_list.push(node_i);
      ans_list.push(nexts[next_i]);
    }
  }
  return ans_list;
}

/**
 *
 * @param {{data: number[], dim: number}} position_ser
 */
function make_position_arr_from_position_ser(position_ser) {
  const dim = position_ser.dim;
  const pos_list = position_ser.data;
  const size = pos_list.length / dim;

  const pos_arr = new Float32Array(size * 3);
  if (dim == 2) {
    for (let i = 0; i < size; ++i) {
      const i2 = i * 2;
      const i3 = i * 3;
      pos_arr[i3] = pos_list[i2];
      pos_arr[i3 + 1] = pos_list[i2 + 1];
    }
  } else {
    for (let i = 0; i < size; ++i) {
      const id = i * dim;
      const i3 = i * 3;
      pos_arr[i3] = pos_list[id];
      pos_arr[i3 + 1] = pos_list[id + 1];
      pos_arr[i3 + 2] = pos_list[id + 2];
    }
  }
  return pos_arr;
}

/**
 *
 * @param {Object} obj
 * @param {any[]} path
 */
function get_local_obj(obj, path_list) {
  let ans_obj = obj;
  for (let path_i = 0; path_i < path_list.length; ++path_list) {
    if (ans_obj == undefined) {
      return;
    }
    ans_obj = ans_obj[path_list[path_i]];
  }
  return ans_obj;
}

/**
 * @typedef {Object} GraphInfo
 * @property {number} resrc_idx
 * @property {any[]} obj_path
 * @property {number[]} position
 */

/**
 * @param {HTMLElement} ext_root_elem_mut_ref
 * @param {any[]} loaded_data
 * @param {GraphInfo[]} graph_info_list
 * @param {any} config
 *
 */
function render_graph_group_helper(
  ext_root_elem_mut_ref,
  loaded_data,
  graph_info_list,
  config
) {
  const scene = new three.Scene();

  const camera = new three.PerspectiveCamera(75, 1.0, 0.01, 10);
  if (config != undefined && config.camera_param != undefined) {
    san.set_perspective_camera_from_param(camera, config.camera_param);
  } else {
    camera.position.z = 2.0;
  }
  const material = new three.LineBasicMaterial({ color: 0xdb2777 });

  for (let graph_i = 0; graph_i < graph_info_list.length; ++graph_i) {
    const {
      resrc_idx: curr_resrc_idx,
      obj_path: curr_obj_path,
      position: curr_position,
    } = graph_info_list[graph_i];
    const curr_obj = loaded_data[curr_resrc_idx];
    /**
     * @type {{adj_list: number[][], position: {data: number[], dim:number}}}
     */
    const curr_graph = get_local_obj(curr_obj, curr_obj_path);
    const pos_att = new three.BufferAttribute(
      make_position_arr_from_position_ser(curr_graph.position),
      3
    );

    const geometry = new three.BufferGeometry();
    geometry.setAttribute("position", pos_att);
    const curr_index_edge_list = make_index_edge_list_from_adj_list(
      curr_graph.adj_list
    );
    geometry.setIndex(curr_index_edge_list);

    const obj = new three.LineSegments(geometry, material);
    obj.position.x = curr_position[0];
    obj.position.y = curr_position[1];
    obj.position.z = curr_position[2];
    scene.add(obj);
  }

  const target_elem = document.createElement("div");
  target_elem.className = "graph_group_canvas";
  ext_root_elem_mut_ref.insertAdjacentElement("afterbegin", target_elem);

  const control = new three.OrbitControls(camera, target_elem);

  let last_update = Date.now();
  const scene_info = new san.SceneInfo(target_elem, scene, camera, () => {
    let now = Date.now();
    control.update((now - last_update) / 1000);
    last_update = now;
  });

  const san_context = window.mdtome.san_context;
  const curr_scene_info_i = san_context.add(scene_info);

  san_context.prepare_fullscreen([curr_scene_info_i], ext_root_elem_mut_ref);
}

/**
 *
 * @param {string} elem_id_string
 * @param {{
 *  load: string[];
 *  graph_info_list: GraphInfo[];
 *  height: string;
 * }} param
 */
export function render_graph_group(elem_id_string, param) {
  const loaded_data = [];
  const load_list = param.load;
  const load_promise_list = [];
  for (let load_i = 0; load_i < load_list.length; ++load_i) {
    const load_res = window.mdtome.fetch_static_json_helper(load_list[load_i]);
    if (load_res.data != undefined) {
      loaded_data.push(load_res.data);
    } else {
      loaded_data.push(undefined);

      load_promise_list.push(
        load_res.promise.then((data) => {
          loaded_data[load_i] = data;
        })
      );
    }
  }
  const elem_mut_ref = document.getElementById(elem_id_string);
  if (elem_mut_ref == undefined) {
    return;
  }
  elem_mut_ref.style.height = param.height;
  if (load_promise_list.length == 0) {
    render_graph_group_helper(
      elem_mut_ref,
      loaded_data,
      param.graph_info_list,
      param.config
    );
    console.log(loaded_data);
  } else {
    Promise.all(load_promise_list).then(() => {
      render_graph_group_helper(
        elem_mut_ref,
        loaded_data,
        param.graph_info_list,
        param.config
      );
      console.log("Promise resolved", loaded_data);
    });
  }
}
