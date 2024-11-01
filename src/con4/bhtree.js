import * as con4 from "../con4.js";
import * as con4_game from "./game.js";
import { GameGraph } from "./graph.js";
import * as con4_graph_util_mod from "./graph/util.js";
import * as graph_ctrl_mod from "../graph/ctrl.js";
import * as three_mod from "../three.js";
import * as san_mod from "../san.js";
import { BarnesHutTree, BarnesHutTreeSer } from "../bhtree.js";
import { render_game_board_with_actions_list } from "./board.js";

const MOUSE_OVER_EVENT_NAME_STRING = "mouseover";
const MOUSE_LEFT_EVENT_NAME_STRING = "mouseleave";
const MOUSE_DOWN_EVENT_NAME_STRING = "mousedown";

const HTML_SECTION_TAG_NAME_STRING = "section";
const HTML_BUTTON_TAG_NAME_STRING = "button";

class ExtState {
  /**@type {string} */
  ext_root_elem_id;
  /**
   * @type {number}
   */
  curr_bht_node_i;

  /**@type {BarnesHutTree} */
  bhtree;

  /**@type {graph_ctrl_mod.GraphController} */
  graph_ctrl;

  /**@type {three_mod.OrbitControls} */
  orbit_ctrl;

  /**
   * @private
   * @type {{
   *  bhtree_nav_list_part_elem_mut_ref: HTMLElement,
   * .active_states_list_elem_mut_ref: HTMLElement,
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
   * active_states_list_elem_mut_ref: HTMLElement,
   *  game_board_elem_mut_ref: HTMLElement
   * }
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
    this.ext_root_elem_id = ext_root_elem_id;
    this.bhtree = bhtree;
    this.graph_ctrl = graph_ctrl;
    this.orbit_ctrl = orbit_ctrl;
    this.curr_bht_node_i = 0;
    this.page_elem_mut_refs = init_obj.page_elem_mut_refs;
    this.game_graph = game_graph;
    this.active_game_state_idx_list = [];
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
  click_on_bht_node(node_i) {
    this.hover_on_bht_node(node_i);
    this.curr_bht_node_i = node_i;
    const { bc_ref } = this.bhtree.get_node_bc_and_br(node_i);
    this.orbit_ctrl.target = new three_mod.Vector3(
      bc_ref[0],
      bc_ref[1],
      bc_ref[2]
    );
  }

  /**
   *
   * @param {number} game_state_i
   */
  draw_game_board(game_state_i) {
    const actions_list = this.game_graph.get_actions_to_a_node(game_state_i);
    render_game_board_with_actions_list(
      this.page_elem_mut_refs.game_board_elem_mut_ref,
      { w: 7, h: 6, actions_list }
    );
    const leaf_node_i = this.bhtree.get_leaf_node_with_value_idx(game_state_i);
    this.bhtree.switch_to_node(leaf_node_i);
  }

  /**
   *
   * @param {number} game_state_i
   */
  add_active_game_state(game_state_i) {
    this.active_game_state_idx_list.push(game_state_i);
    this.render_active_states_list();
    this.draw_game_board(game_state_i);
    const node_ref = this.game_graph.nodes_list[game_state_i];
    const next_info_list = node_ref.next_node_info_list;
    for (let i = 0; i < next_info_list.length; ++i) {
      const { edge_i } = next_info_list[i];
      this.graph_ctrl.show_edge(edge_i);
    }
  }

  render_active_states_list() {
    const active_state_idxs_list = this.active_game_state_idx_list;
    const button_elems_list = [];
    for (let i = 0; i < active_state_idxs_list.length; ++i) {
      const state_i = this.active_game_state_idx_list[i];
      const curr_btn = document.createElement(HTML_BUTTON_TAG_NAME_STRING);
      curr_btn.addEventListener(MOUSE_OVER_EVENT_NAME_STRING, () => {
        this.draw_game_board(state_i);
      });
      curr_btn.addEventListener(MOUSE_LEFT_EVENT_NAME_STRING, () => {
        this.bhtree.switch_to_node(this.curr_bht_node_i);
      });
      curr_btn.addEventListener(MOUSE_DOWN_EVENT_NAME_STRING, () => {
        const leaf_node_i = this.bhtree.get_leaf_node_with_value_idx(state_i);
        this.click_on_bht_node(leaf_node_i);
      });
      curr_btn.textContent = `State ${state_i}`;
      button_elems_list.push(curr_btn);
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

      curr_btn_mut_ref.textContent = `Go Internal ${next_i} (${bhtree_mut_ref.barnes_hut_tree_obj.ns[next_i]})`;
      curr_btn_mut_ref.addEventListener(MOUSE_OVER_EVENT_NAME_STRING, () => {
        state.hover_on_bht_node(next_i);
      });
      curr_btn_mut_ref.addEventListener(MOUSE_LEFT_EVENT_NAME_STRING, () => {
        state.hover_on_bht_node(curr_bht_node_i);
      });
      curr_btn_mut_ref.addEventListener(MOUSE_DOWN_EVENT_NAME_STRING, () => {
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

      curr_btn_mut_ref.addEventListener(MOUSE_DOWN_EVENT_NAME_STRING, () => {
        state.add_active_game_state(state_i);
      });
      list_inner_btn_elems.push(curr_btn_mut_ref);
    }

    const parent_node_i =
      bhtree_mut_ref.barnes_hut_tree_obj.parents[curr_bht_node_i];
    if (parent_node_i != null) {
      const pop_btn_mut_ref = document.createElement("button");
      pop_btn_mut_ref.textContent = "Pop";
      pop_btn_mut_ref.addEventListener(MOUSE_OVER_EVENT_NAME_STRING, () => {
        state.hover_on_bht_node(parent_node_i);
      });
      pop_btn_mut_ref.addEventListener(MOUSE_LEFT_EVENT_NAME_STRING, () => {
        state.hover_on_bht_node(curr_bht_node_i);
      });
      pop_btn_mut_ref.addEventListener(MOUSE_DOWN_EVENT_NAME_STRING, () => {
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
 */
function modify_ext_root_elem_mut_ref(ext_root_elem_mut_ref) {
  const bhtree_nav_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );
  bhtree_nav_elem_mut_ref.classList = "con4_bhtree_nav";

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
  active_states_elem_mut_ref.classList = "con4_bhtree_active_states";

  const active_states_title_elem_mut_ref = document.createElement("h4");
  active_states_title_elem_mut_ref.textContent = "Active States";
  active_states_elem_mut_ref.appendChild(active_states_title_elem_mut_ref);

  const active_states_list_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );
  active_states_list_elem_mut_ref.classList = "con4_bhtree_active_states_list";

  active_states_elem_mut_ref.appendChild(active_states_list_elem_mut_ref);

  const game_board_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );

  game_board_elem_mut_ref.classList = "con4_bhtree_game_board";

  ext_root_elem_mut_ref.appendChild(bhtree_nav_elem_mut_ref);
  ext_root_elem_mut_ref.appendChild(active_states_elem_mut_ref);

  const panel_elem_mut_ref = document.createElement(
    HTML_SECTION_TAG_NAME_STRING
  );
  panel_elem_mut_ref.classList = "con4_bhtree_panel";

  const game_board_title_mut_ref = document.createElement("h4");
  game_board_title_mut_ref.textContent = "Board";

  panel_elem_mut_ref.appendChild(game_board_title_mut_ref);
  panel_elem_mut_ref.appendChild(game_board_elem_mut_ref);
  const nav_elem_mut_ref = document.createElement(HTML_SECTION_TAG_NAME_STRING);
  nav_elem_mut_ref.classList = "con4_bhtree_panel_nav";
  panel_elem_mut_ref.appendChild(nav_elem_mut_ref);

  nav_elem_mut_ref.appendChild(bhtree_nav_elem_mut_ref);
  nav_elem_mut_ref.appendChild(active_states_elem_mut_ref);

  ext_root_elem_mut_ref.appendChild(panel_elem_mut_ref);
  render_game_board_with_actions_list(game_board_elem_mut_ref, {
    w: 7,
    h: 6,
    actions_list: [],
  });

  return {
    bhtree_nav_list_part_elem_mut_ref,
    active_states_list_elem_mut_ref,
    game_board_elem_mut_ref,
  };
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
 * game: {name: string, start: number[]}
 * }} game_graph_ser
 * @param {BarnesHutTreeSer} bhtree_ser
 */
function render_con4_bhtree_elem(ext_root_elem_id, game_graph_ser, bhtree_ser) {
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

  const game_graph = new GameGraph(game_graph_ser);

  const page_elem_mut_refs = modify_ext_root_elem_mut_ref(
    ext_root_elem_mut_ref
  );

  const state_init_obj = {
    page_elem_mut_refs,
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
 *  gamegraph_url_idx: number
 *  bhtree_data_url_idx: number
 * }} param
 */
export function render_con4_bhtree(ext_root_elem_id, param) {
  function load_bht_and_render(game_graph_ser) {
    let bhtree_data_res = window.mdtome.fetch_static_json_helper(param.load[1]);
    if (bhtree_data_res.data != undefined) {
      render_con4_bhtree_elem(
        ext_root_elem_id,
        game_graph_ser,
        bhtree_data_res.data
      );
    } else {
      bhtree_data_res.promise
        .then((bhtree_data) => {
          render_con4_bhtree_elem(
            ext_root_elem_id,
            game_graph_ser,
            bhtree_data
          );
        })
        .catch((err_msg) => {
          console.log(err_msg);
        });
    }
  }

  let game_graph_res = window.mdtome.fetch_static_json_helper(param.load[0]);
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
