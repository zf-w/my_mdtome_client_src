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

import { BarnesHutTree, BarnesHutTreeSer } from "../../bhtree.js";
import { GameGraph } from "../graph.js";
import * as con4_graph_util_mod from "../graph/util.js";
import * as graph_ctrl_mod from "../../graph/ctrl.js";
import * as three_mod from "../../three.js";
import * as san_mod from "../../san.js";
import { render_game_board_with_actions_list } from "../board.js";

const EVENT_MOUSE_OVER_NAME_STRING = "mouseover";
const EVENT_MOUSE_LEFT_NAME_STRING = "mouseleave";
const EVENT_MOUSE_DOWN_NAME_STRING = "mousedown";

const HTML_SECTION_TAG_NAME_STRING = "section";
const HTML_BUTTON_TAG_NAME_STRING = "button";

/**
 *
 * @param {{
 * text:string,
 * class_string?: string,
 * id_string?: string,
 * mouse_over_callback: Function,
 * mouse_down_callback: Function,
 * mouse_left_callback?: Function
 * }} param
 */
function make_button_elem(param) {
  const {
    class_string,
    id_string,
    text,
    mouse_down_callback,
    mouse_left_callback,
    mouse_over_callback,
  } = param;
  const ans_button = document.createElement(HTML_BUTTON_TAG_NAME_STRING);
  if (class_string) {
    ans_button.className = class_string;
  }
  if (id_string) {
    ans_button.id = id_string;
  }
  ans_button.textContent = text;
  ans_button.addEventListener(
    EVENT_MOUSE_DOWN_NAME_STRING,
    mouse_down_callback
  );
  ans_button.addEventListener(
    EVENT_MOUSE_OVER_NAME_STRING,
    mouse_over_callback
  );
  if (mouse_left_callback) {
    ans_button.addEventListener(
      EVENT_MOUSE_LEFT_NAME_STRING,
      mouse_left_callback
    );
  }
  return ans_button;
}

class ExtState {
  /**
   * @type {number[]}
   */
  active_game_state_idx_list;
  /**@type {BarnesHutTree} */
  bhtree;
  /**
   * @type {number}
   */
  curr_bht_node_i;
  /**
   * @type {number | undefined}
   */
  curr_game_state_i;
  /**@type {string} */
  ext_root_elem_id;

  /**@type {graph_ctrl_mod.GraphController} */
  graph_ctrl;

  /**@type { (actions_list: number[]) => {}} */
  render_game_fn;

  /**@type {three_mod.OrbitControls} */
  orbit_ctrl;

  /**
   * @private
   * @type {{
   *  bhtree_nav_list_part_elem_mut_ref: HTMLElement,
   *  active_states_list_elem_mut_ref: HTMLElement,
   *  game_board_elem_mut_ref: HTMLElement
   * }}
   */
  page_elem_mut_refs;

  /**
   * @param {string} ext_root_elem_id
   * @param {BarnesHutTree} bhtree
   * @param {GameGraph} game_graph
   * @param {graph_ctrl_mod.GraphController} graph_ctrl
   * @param {three_mod.OrbitControls} orbit_ctrl
   * @param {{
   * page_elem_mut_refs: {
   *  bht_nav_list_elem_mut_ref: HTMLElement,
   *  active_states_list_elem_mut_ref: HTMLElement,
   *  game_board_elem_mut_ref: HTMLElement
   * },
   * start_active_states_list: number[],
   * render_game_fn: (actions_list: number[]) => {}
   * }} init_obj
   */
  constructor(
    ext_root_elem_id,
    bhtree,
    game_graph,
    graph_ctrl,
    orbit_ctrl,
    init_obj
  ) {
    this.bhtree = bhtree;
    this.game_graph = game_graph;

    this.graph_ctrl = graph_ctrl;
    this.orbit_ctrl = orbit_ctrl;

    this.ext_root_elem_id = ext_root_elem_id;
    this.curr_game_state_i = undefined;
    this.curr_bht_node_i = 0;

    this.page_elem_mut_refs = init_obj.page_elem_mut_refs;
    this.render_game_fn = init_obj.render_game_fn;
    if (init_obj.start_active_states_list) {
      this.active_game_state_idx_list = init_obj.start_active_states_list;
    } else {
      this.active_game_state_idx_list = [];
    }
    for (let i = 0; i < this.active_game_state_idx_list.length; ++i) {
      const node_i = this.active_game_state_idx_list[i];
      this.draw_graph_node_out_edges(node_i);
    }
    this.render_active_states_list();
  }

  /**
   *
   * @param {number} node_i
   */
  hover_on_bht_node(node_i) {
    this.bhtree.switch_to_node(node_i);
  }

  /**
   *
   * @param {number} node_i
   */
  set_camera_focus_on_bht_node(node_i) {
    const { bc_ref } = this.bhtree.get_node_bc_and_br(node_i);
    this.orbit_ctrl.target = new three_mod.Vector3(
      bc_ref[0],
      bc_ref[1],
      bc_ref[2]
    );
  }

  /**
   *
   * @param {number} node_i
   */
  click_on_bht_node(node_i) {
    this.hover_on_bht_node(node_i);
    this.curr_bht_node_i = node_i;
    this.set_camera_focus_on_bht_node(node_i);
  }

  /**
   *
   * @param {number} game_state_i
   */
  draw_game_board(game_state_i) {
    if (game_state_i == undefined) {
      return;
    }
    const actions_list = this.game_graph.get_actions_to_a_node(game_state_i);
    this.render_game_fn(actions_list);
    const leaf_node_i = this.bhtree.get_leaf_node_with_value_idx(game_state_i);
    this.bhtree.switch_to_node(leaf_node_i);
  }

  /**
   *
   * @param {number} game_state_i
   */
  hover_on_game_state(game_state_i) {
    this.draw_game_board(game_state_i);
    const bht_leaf_node_i =
      this.bhtree.get_leaf_node_with_value_idx(game_state_i);
    this.hover_on_bht_node(bht_leaf_node_i);
  }

  /**
   *
   * @param {number} node_i
   */
  draw_graph_node_out_edges(node_i) {
    const node_ref = this.game_graph.nodes_list[node_i];
    const next_info_list = node_ref.next_node_info_list;
    for (let i = 0; i < next_info_list.length; ++i) {
      const { edge_i } = next_info_list[i];
      this.graph_ctrl.show_edge(edge_i);
    }
  }

  /**
   *
   * @param {number} game_state_i
   */
  push_active_game_state(game_state_i) {
    this.active_game_state_idx_list.push(game_state_i);
    this.curr_game_state_i = game_state_i;
    const leaf_node_i = this.bhtree.get_leaf_node_with_value_idx(game_state_i);
    this.click_on_bht_node(leaf_node_i);
    this.draw_graph_node_out_edges(game_state_i);
    this.render_active_states_list();
  }

  /**
   *
   * @param {number} active_elem_i
   */
  remove_active_game_state(active_elem_i) {
    const game_state_i = this.active_game_state_idx_list[active_elem_i];

    const node_ref = this.game_graph.nodes_list[game_state_i];
    const next_info_list = node_ref.next_node_info_list;
    for (let i = 0; i < next_info_list.length; ++i) {
      const { edge_i } = next_info_list[i];
      this.graph_ctrl.hide_edge(edge_i);
    }

    if (game_state_i == this.curr_game_state_i) {
      this.curr_game_state_i = undefined;
    }
    this.active_game_state_idx_list.splice(active_elem_i, 1);
    this.render_active_states_list();
  }

  render_active_states_list() {
    const active_state_idxs_list = this.active_game_state_idx_list;
    const button_elems_list = [];
    for (let i = 0; i < active_state_idxs_list.length; ++i) {
      const state_i = this.active_game_state_idx_list[i];
      const div_elem = document.createElement("div");
      div_elem.className = "con4_bhtree_state_btn";
      const curr_btn_elem = make_button_elem({
        text: `State ${state_i}`,
        mouse_down_callback: () => {
          const leaf_node_i = this.bhtree.get_leaf_node_with_value_idx(state_i);
          this.curr_game_state_i = state_i;
          this.click_on_bht_node(leaf_node_i);
          this.render_active_states_list();
        },
        mouse_over_callback: () => {
          this.draw_game_board(state_i);
        },
        mouse_left_callback: () => {
          this.bhtree.switch_to_node(this.curr_bht_node_i);
          this.draw_game_board(this.curr_game_state_i);
        },
      });
      const rm_btn_elem = make_button_elem({
        text: "[rm]",
        class_string: "con4_bhtree_rm",
        mouse_down_callback: (event) => {
          event.preventDefault();
          this.remove_active_game_state(i);
        },
      });
      div_elem.appendChild(curr_btn_elem);
      div_elem.appendChild(rm_btn_elem);
      if (this.curr_game_state_i == state_i) {
        div_elem.classList.add("active");
      }
      button_elems_list.push(div_elem);
    }

    if (this.curr_game_state_i != undefined) {
      const node_ref = this.game_graph.nodes_list[this.curr_game_state_i];
      const prev_state_info_list = node_ref.prev_node_info_list;
      const next_state_info_list = node_ref.next_node_info_list;

      for (let i = 0; i < prev_state_info_list.length; ++i) {
        const { prev_node_i } = prev_state_info_list[i];
        const btn = make_button_elem({
          text: `Prev ${prev_node_i}`,
          class_string: "con4_bhtree_state_btn",
          mouse_down_callback: () => {
            this.push_active_game_state(prev_node_i);
          },
          mouse_over_callback: () => {
            this.hover_on_game_state(prev_node_i);
          },
          mouse_left_callback: () => {
            this.draw_game_board(this.curr_game_state_i);
            this.hover_on_bht_node(this.curr_bht_node_i);
          },
        });
        button_elems_list.push(btn);
      }
      for (let i = 0; i < next_state_info_list.length; ++i) {
        const { next_node_i } = next_state_info_list[i];
        const btn = make_button_elem({
          text: `Next ${next_node_i}`,
          class_string: "con4_bhtree_state_btn",
          mouse_down_callback: () => {
            this.push_active_game_state(next_node_i);
          },
          mouse_over_callback: () => {
            this.hover_on_game_state(next_node_i);
          },
          mouse_left_callback: () => {
            this.draw_game_board(this.curr_game_state_i);
            this.hover_on_bht_node(this.curr_bht_node_i);
          },
        });
        button_elems_list.push(btn);
      }
    }
    this.page_elem_mut_refs.active_states_list_elem_mut_ref.replaceChildren(
      ...button_elems_list
    );
  }

  render_bhtree_nav_part() {
    const state = this;
    const bhtree_nav_list_part_elem_mut_ref =
      state.page_elem_mut_refs.bhtree_nav_list_part_elem_mut_ref;
    const bhtree_mut_ref = state.bhtree;
    const curr_bht_node_i = state.curr_bht_node_i;

    const next_idxs_list =
      bhtree_mut_ref.get_next_node_idxs_ref(curr_bht_node_i);
    let list_inner_btn_elems = [];
    for (let i = 0; i < next_idxs_list.length; ++i) {
      const next_i = next_idxs_list[i];

      const curr_btn_mut_ref = document.createElement("button");
      // curr_btn_mut_ref.id = make_bht_panel_btn_elem_id(ext_root_elem_id, next_i);

      curr_btn_mut_ref.textContent = `Go Internal ${next_i} (${bhtree_mut_ref.barnes_hut_tree_ser.ns[next_i]})`;
      curr_btn_mut_ref.addEventListener(EVENT_MOUSE_OVER_NAME_STRING, () => {
        state.hover_on_bht_node(next_i);
      });
      curr_btn_mut_ref.addEventListener(EVENT_MOUSE_LEFT_NAME_STRING, () => {
        state.hover_on_bht_node(curr_bht_node_i);
      });
      curr_btn_mut_ref.addEventListener(EVENT_MOUSE_DOWN_NAME_STRING, () => {
        state.click_on_bht_node(next_i);
        state.render_bhtree_nav_part();
      });
      list_inner_btn_elems.push(curr_btn_mut_ref);
    }

    const value_idxs_list =
      bhtree_mut_ref.get_contained_value_idxs_ref(curr_bht_node_i);

    for (let i = 0; i < value_idxs_list.length; ++i) {
      const state_i = value_idxs_list[i];
      const curr_btn_mut_ref = document.createElement("button");

      curr_btn_mut_ref.textContent = `Pick Leaf ${state_i}`;

      curr_btn_mut_ref.addEventListener(EVENT_MOUSE_DOWN_NAME_STRING, () => {
        state.push_active_game_state(state_i);
      });
      list_inner_btn_elems.push(curr_btn_mut_ref);
    }

    const parent_node_i =
      bhtree_mut_ref.barnes_hut_tree_ser.parents[curr_bht_node_i];
    if (parent_node_i != null) {
      const pop_btn_mut_ref = document.createElement("button");
      pop_btn_mut_ref.textContent = "Pop";
      pop_btn_mut_ref.addEventListener(EVENT_MOUSE_OVER_NAME_STRING, () => {
        state.hover_on_bht_node(parent_node_i);
      });
      pop_btn_mut_ref.addEventListener(EVENT_MOUSE_LEFT_NAME_STRING, () => {
        state.hover_on_bht_node(curr_bht_node_i);
      });
      pop_btn_mut_ref.addEventListener(EVENT_MOUSE_DOWN_NAME_STRING, () => {
        state.click_on_bht_node(parent_node_i);
        state.render_bhtree_nav_part();
      });
      list_inner_btn_elems.push(pop_btn_mut_ref);
    }

    bhtree_nav_list_part_elem_mut_ref.replaceChildren(...list_inner_btn_elems);
  }
}

/**
 *
 * @param {HTMLElement} ext_root_elem_mut_ref
 * @param {Con4Game} con4_game Connect Four Game Object
 */
function modify_ext_root_elem_mut_ref(ext_root_elem_mut_ref, con4_game) {
  const bhtree_nav_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );
  bhtree_nav_elem_mut_ref.className = "con4_bhtree_nav";

  const bhtree_nav_title_elem_ref = document.createElement("h4");
  bhtree_nav_title_elem_ref.textContent = "Octree Nav";
  bhtree_nav_elem_mut_ref.appendChild(bhtree_nav_title_elem_ref);

  const bhtree_nav_list_part_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );

  bhtree_nav_elem_mut_ref.appendChild(bhtree_nav_list_part_elem_mut_ref);

  const active_states_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );
  active_states_elem_mut_ref.className = "con4_bhtree_active_states";

  const active_states_title_elem_mut_ref = document.createElement("h4");
  active_states_title_elem_mut_ref.textContent = "Active States";
  active_states_elem_mut_ref.appendChild(active_states_title_elem_mut_ref);

  const active_states_list_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );
  active_states_list_elem_mut_ref.className = "con4_bhtree_active_states_list";

  active_states_elem_mut_ref.appendChild(active_states_list_elem_mut_ref);

  const game_board_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );

  game_board_elem_mut_ref.className = "con4_bhtree_game_board";

  ext_root_elem_mut_ref.appendChild(bhtree_nav_elem_mut_ref);
  ext_root_elem_mut_ref.appendChild(active_states_elem_mut_ref);

  const panel_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );
  panel_elem_mut_ref.className = "con4_bhtree_panel";

  const game_board_title_mut_ref = document.createElement("h4");
  game_board_title_mut_ref.textContent = "Board";

  panel_elem_mut_ref.appendChild(game_board_title_mut_ref);
  panel_elem_mut_ref.appendChild(game_board_elem_mut_ref);
  const nav_elem_mut_ref = document.createElement(HTML_SECTION_TAG_NAME_STRING);
  nav_elem_mut_ref.className = "con4_bhtree_panel_nav";
  panel_elem_mut_ref.appendChild(nav_elem_mut_ref);

  nav_elem_mut_ref.appendChild(bhtree_nav_elem_mut_ref);
  nav_elem_mut_ref.appendChild(active_states_elem_mut_ref);

  ext_root_elem_mut_ref.appendChild(panel_elem_mut_ref);
  render_game_board_with_actions_list(game_board_elem_mut_ref, {
    w: con4_game.w,
    h: con4_game.h,
    actions_list: [],
  });

  return {
    bhtree_nav_list_part_elem_mut_ref,
    active_states_list_elem_mut_ref,
    game_board_elem_mut_ref,
  };
}

class Con4Game {
  /**
   *
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    /**
     * @type {number}
     */
    this.w = width;
    /**
     * @type {number}
     */
    this.h = height;
  }

  get_init_flip_state() {
    return 0;
  }

  fold_flip_state(prev_flip_state, flip_state) {
    return prev_flip_state ^ flip_state;
  }

  calc_true_action_based_on_flip_state(action, flip_state) {
    if (flip_state == 1) {
      return this.w - 1 - action;
    } else {
      return action;
    }
  }
}

/**
 *
 * @param {string} ext_root_elem_id
 * @param {{
 * colors: {
 *  colors: number[],
 *  color_map: {color_i: number[], color_rgb: number[]}
 * },
 * position: {data: number[], dim: number},
 * game: {name: string, start: number[], width: number, height:number}
 * }} game_graph_ser
 * @param {BarnesHutTreeSer} bhtree_ser
 */
function render_con4_bhtree_elem(
  ext_root_elem_id,
  game_graph_ser,
  bhtree_ser,
  start_active_states_list
) {
  /**
   * @type {san_mod.San}
   */
  const san_context = window.mdtome.san_context;
  const scene = new three_mod.Scene();

  const camera = new three_mod.PerspectiveCamera(75, 1.0, 0.01, 10);
  camera.position.z = 2.0;

  const ext_root_elem_mut_ref = document.getElementById(ext_root_elem_id);

  const orbit_control = new three_mod.OrbitControls(
    camera,
    ext_root_elem_mut_ref
  );

  orbit_control.autoRotate = true;
  orbit_control.autoRotateSpeed = 0.1;

  const con4_w = game_graph_ser.game.width ? game_graph_ser.game.width : 7;
  const con4_h = game_graph_ser.game.height ? game_graph_ser.game.height : 6;

  const [graph_index, action_node_edge_adj] =
    con4_graph_util_mod.build_index_and_node_edge_adj_from_actions_map(
      game_graph_ser.actions
    );

  const graph_ctrl = new graph_ctrl_mod.GraphController({
    index: graph_index,
    position: game_graph_ser.position,
    slug: `Graph Game: ${ext_root_elem_id}`,
  });
  con4_graph_util_mod.init_graph_with_game_graph(
    graph_ctrl,
    game_graph_ser,
    action_node_edge_adj
  );

  scene.add(graph_ctrl.obj);

  const bhtree = new BarnesHutTree(bhtree_ser);
  scene.add(bhtree.three_obj);

  const con4_game = new Con4Game(con4_w, con4_h);

  const game_graph = new GameGraph(game_graph_ser, con4_game);

  const page_elem_mut_refs = modify_ext_root_elem_mut_ref(
    ext_root_elem_mut_ref,
    con4_game
  );

  const state_init_obj = {
    page_elem_mut_refs,
    start_active_states_list,
    render_game_fn: (actions_list) => {
      render_game_board_with_actions_list(
        page_elem_mut_refs.game_board_elem_mut_ref,
        { w: con4_w, h: con4_h, actions_list }
      );
    },
  };

  const state = new ExtState(
    ext_root_elem_id,
    bhtree,
    game_graph,
    graph_ctrl,
    orbit_control,
    state_init_obj
  );

  state.render_bhtree_nav_part();

  const scene_info = new san_mod.SceneInfo(
    ext_root_elem_mut_ref,
    scene,
    camera,
    () => {
      orbit_control.update();
    }
  );

  const curr_scene_info_i = san_context.add(scene_info);
  san_context.prepare_fullscreen([curr_scene_info_i], ext_root_elem_mut_ref);
}

/**
 *
 * @param {number} ext_root_elem_id
 * @param {{
 *  load: string[],
 *  gamegraph_url_idx: number,
 *  bhtree_data_url_idx: number,
 *  start_active_states_list: number[]
 * }} param
 */
export function render_con4_bhtree(ext_root_elem_id, param) {
  const { start_active_states_list, load: load_url_list } = param;
  function load_bht_and_render(game_graph_ser) {
    let bhtree_data_res = window.mdtome.fetch_static_json_helper(
      load_url_list[1]
    );
    if (bhtree_data_res.data != undefined) {
      render_con4_bhtree_elem(
        ext_root_elem_id,
        game_graph_ser,
        bhtree_data_res.data,
        start_active_states_list
      );
    } else {
      bhtree_data_res.promise
        .then((bhtree_data) => {
          render_con4_bhtree_elem(
            ext_root_elem_id,
            game_graph_ser,
            bhtree_data,
            start_active_states_list
          );
        })
        .catch((err_msg) => {
          console.log(err_msg);
        });
    }
  }

  let game_graph_res = window.mdtome.fetch_static_json_helper(load_url_list[0]);
  if (game_graph_res.data != undefined) {
    load_bht_and_render(ext_root_elem_id, game_graph_res.data);
  } else {
    game_graph_res.promise
      .then((game_graph_ser) => {
        load_bht_and_render(game_graph_ser);
      })
      .catch((err_msg) => {
        console.log(err_msg);
      });
  }
}
