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

import * as con4 from "con4";
import * as con4_game from "con4_game";
import * as con4_graph_util from "./graph/util.js";
import * as graph_ctrl_mod from "graph_ctrl";
import * as three from "three";
import * as san from "san";

/**
 * @typedef {Object} GameGraphNode
 * @property {{action:number, next_node_i: number, edge_i: number, flip: number}[]} next_node_info_list
 * @property {{prev_node_i:number, next_node_info_i: number}[]} prev_node_info_list
 */

/**
 * @callback get_init_flip_state
 * @returns {*}
 */

/**
 * @callback fold_flip_state
 *
 * @param {*} prev_flip_state
 * @param {*} curr_flip_state
 * @returns {*} next_flip_state
 */

/**
 * @callback calc_true_action_based_on_flip_state
 * @param {*} action
 * @param {*} flip_state
 */

/**
 * @typedef {Object} Game
 * @property {get_init_flip_state} get_init_flip_state
 * @property {fold_flip_state} fold_flip_state
 * @property {calc_true_action_based_on_flip_state} calc_true_action_based_on_flip_state
 */

export class GameGraph {
  /**
   *
   * @param {{
   * actions: number[][][],
   * nodes: {colors: {
   *  colors: number[],
   *  color_map: {color_i: number[], color_rgb: number[]}
   *  }
   * },
   * position: {data: number[], dim: number},
   * game: {name: string, start: number[]}
   * }} game_graph_ser
   *
   * @param {Game} game
   */
  constructor(game_graph_ser, game) {
    /**
     * @type {GameGraphNode[]}
     */
    const nodes_list = [];

    const action_next_state_lists = game_graph_ser.actions;
    for (let node_i = 0; node_i < action_next_state_lists.length; ++node_i) {
      nodes_list.push({
        next_node_info_list: [],
        prev_node_info_list: [],
      });
    }
    let edge_len = 0;
    for (let node_i = 0; node_i < action_next_state_lists.length; ++node_i) {
      const curr_action_next_state_list = action_next_state_lists[node_i];

      for (let i = 0; i < curr_action_next_state_list.length; ++i) {
        const [raw_action, next_node_i, flip] = curr_action_next_state_list[i];
        const node_ref = nodes_list[node_i];

        const next_node_info_i = node_ref.next_node_info_list.length;

        node_ref.next_node_info_list.push({
          action: raw_action - 1,
          next_node_i,
          edge_i: edge_len,
          flip,
        });

        nodes_list[next_node_i].prev_node_info_list.push({
          prev_node_i: node_i,
          next_node_info_i,
        });
        edge_len += 1;
      }
    }
    /**
     * @type {Game}
     */
    this.game = game;

    /**
     * @type {GameGraphNode[]}
     */
    this.nodes_list = nodes_list;
  }

  /**
   *
   * @param {number} node_i
   */
  get_actions_to_a_node(node_i) {
    let curr_node_i = node_i;

    let ans_actions_list = [];
    let flip_state_i = this.game.get_init_flip_state();
    while (this.nodes_list[curr_node_i].prev_node_info_list.length > 0) {
      const curr_node_ref = this.nodes_list[curr_node_i];
      const curr_prev_idxs_list = curr_node_ref.prev_node_info_list;
      const { next_node_info_i, prev_node_i } = curr_prev_idxs_list[0];

      const action_info =
        this.nodes_list[prev_node_i].next_node_info_list[next_node_info_i];
      let action = action_info.action;
      flip_state_i = this.game.fold_flip_state(flip_state_i, action_info.flip);
      action = this.game.calc_true_action_based_on_flip_state(
        action,
        flip_state_i
      );
      ans_actions_list.push(action);
      curr_node_i = prev_node_i;
    }
    return ans_actions_list.reverse();
  }
}

/**
 *
 * @param {string} elem_id
 * @param {{
 * actions: number[][][],
 * nodes: {colors: {
 *  colors: number[],
 *  color_map: {color_i: number[], color_rgb: number[]}
 *  }
 * },
 * position: {data: number[], dim: number},
 * game: {name: string, start: number[]}
 * }} game_graph
 * @param {{
 *  load: string[],
 *  following_actions_string: string,
 *  camera_param: {
 *  z: number
 * },
 * orbit_ctrl_param: {
 *  auto_rotate_speed: number
 * }
 * }} param
 */
function render_with_game_graph(elem_id, game_graph, param) {
  console.log(game_graph);

  const look_at_target_vec3 = new three.Vector3(0, 0, 0);
  const [graph_index, action_node_edge_adj] =
    con4_graph_util.build_index_and_node_edge_adj_from_actions_map(
      game_graph.actions
    );

  const { api_url, following_actions_string } = param;
  const following_actions_list = con4.actions_string_to_list(
    following_actions_string
  );

  const { w, h, start: base_actions_list } = game_graph.game;
  const game_ctrl = {
    flip: (action) => {
      return w - 1 - action;
    },
  };

  const graph_ctrl = new graph_ctrl_mod.GraphController({
    index: graph_index,
    position: game_graph.position,
    slug: `Graph Game: ${elem_id}`,
  });
  con4_graph_util.init_graph_with_game_graph(
    graph_ctrl,
    game_graph,
    action_node_edge_adj
  );

  const elem_mut_ref = document.getElementById(elem_id);

  const [game_elem_string, game_elem_util] =
    con4_game.make_con4_game_inner_string(
      elem_id,
      w,
      h,
      base_actions_list,
      following_actions_list
    );
  elem_mut_ref.innerHTML = `<section class="con4_graph_wrapper">${game_elem_string}</section>`;

  const graph_elem_mut_ref = elem_mut_ref;
  const scene = new three.Scene();
  scene.add(graph_ctrl.obj);

  const camera = new three.PerspectiveCamera(75, 1.0, 0.01, 10);
  camera.position.z = 1.0;
  if (param.camera_param != undefined) {
    san.set_perspective_camera_from_param(camera, param.camera_param);
  }
  const control = new three.OrbitControls(camera, graph_elem_mut_ref);
  if (param.orbit_ctrl_param != undefined) {
    san.set_orbit_ctrl_from_param(control, param.orbit_ctrl_param);
  }

  control.target = look_at_target_vec3;

  let last_update = Date.now();
  const scene_info = new san.SceneInfo(
    graph_elem_mut_ref,
    scene,
    camera,
    () => {
      let now = Date.now();
      control.update((now - last_update) / 1000);
      last_update = now;
    }
  );
  const san_context = window.mdtome.san_context;
  const scene_i = san_context.add(scene_info);
  san_context.prepare_fullscreen([scene_i], elem_mut_ref);

  const core = {
    w,
    h,
    elem_mut_ref,
    api_url,
    base_actions_list,
    following_actions_list,
    utils: game_elem_util,
  };

  let clear_graph;
  const render_graph = (following_actions_list, imagine_action) => {
    const actions_list = con4.collect_actions(
      base_actions_list,
      following_actions_list,
      imagine_action
    );
    if (imagine_action != undefined) {
      con4_graph_util.calc_target_position(
        graph_ctrl,
        game_ctrl,
        action_node_edge_adj,
        actions_list,
        look_at_target_vec3
      );
    }
    if (clear_graph != undefined) {
      clear_graph();
    }
    con4_graph_util.draw_graph(
      graph_ctrl,
      game_ctrl,
      action_node_edge_adj,
      actions_list,
      true
    );

    clear_graph = () => {
      con4_graph_util.draw_graph(
        graph_ctrl,
        game_ctrl,
        action_node_edge_adj,
        actions_list,
        false
      );
    };
  };

  const { play_fn, undo_fn, imagine_fn, fetch_fn } =
    con4_game.make_con4_game_logic_callbacks(
      core,
      render_graph,
      (base_actions_list, following_actions_list) => {
        return con4_graph_util.calc_target_result(
          game_ctrl,
          action_node_edge_adj,
          game_graph,
          following_actions_list
        );
      }
    );

  con4_game.add_listeners_to_con4_game_ctrl(
    elem_id,
    w,
    play_fn,
    undo_fn,
    imagine_fn
  );

  render_graph(following_actions_list, undefined);
  fetch_fn();
}
/**
 *
 * @param {string} elem_id
 * @param {{
 *  load: string[],
 *  following_actions_string: string,
 *  camera_param: {
 *  z: number
 * },
 * orbit_ctrl_param: {
 *  auto_rotate_speed: number
 * }
 * }} param
 */
export function render_con4_graph(elem_id, param) {
  let res = window.mdtome.fetch_static_json_helper(param.load[0]);
  if (res.data != undefined) {
    render_with_game_graph(elem_id, res.param, param);
  } else {
    res.promise
      .then((game_graph) => {
        render_with_game_graph(elem_id, game_graph, param);
      })
      .catch((err_msg) => {
        console.log(err_msg);
      });
  }
}
