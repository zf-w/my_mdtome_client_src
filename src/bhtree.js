import * as three from "./three.js";

/**
 *
 * @param {number[]} bc
 * @param {number} br
 * @param {Float32Array} position_arr_mut_ref
 */
function set_vertices_of_3d_cube(bc, br, position_arr_mut_ref) {
  for (let o = 0; o < 8; ++o) {
    const o3 = o * 3;
    let o_mut = o;
    for (let d = 0; d < 3; ++d) {
      position_arr_mut_ref[o3 + d] = bc[d] + (2 * (o_mut % 2) - 1) * br;
      o_mut = o_mut >> 1;
    }
  }
}

export class BarnesHutTreeSer {
  /**@type {number} */
  dim;
  /**@type {number} */
  num;
  /**@type {number[]} */
  parents;
  /**@type {number[]} */
  bcs;
  /**@type {number[]} */
  brs;
  /**@type {number[]} */
  ns;
  /** @type {number[]} */
  to_leafs;
  /**@type {number[]} */
  idxs;
}

export class BarnesHutTree {
  /**
   *
   * @param {BarnesHutTreeSer} barnes_hut_tree_obj
   */
  constructor(barnes_hut_tree_obj) {
    /**
     *
     * @type {BarnesHutTreeSer} barnes_hut_tree_obj
     */
    this.barnes_hut_tree_obj = barnes_hut_tree_obj;

    /**@type {number[][]} */
    this.next_node_idx_lists = [];
    const parent_idxs_list = barnes_hut_tree_obj.parents;

    /**@type {number[][]} */
    this.contain_value_idx_lists = [];
    for (let i = 0; i < parent_idxs_list.length; ++i) {
      this.next_node_idx_lists.push([]);
      this.contain_value_idx_lists.push([]);
    }

    for (let i = 0; i < parent_idxs_list.length; ++i) {
      const parent_idx = parent_idxs_list[i];
      if (parent_idx != null) {
        this.next_node_idx_lists[parent_idx].push(i);
      }
    }

    const to_leafs = barnes_hut_tree_obj.to_leafs;
    for (let value_i = 0; value_i < to_leafs.length; ++value_i) {
      const parent_leaf_i = to_leafs[value_i];
      this.contain_value_idx_lists[parent_leaf_i].push(value_i);
    }

    const position_arr = new Float32Array(24);

    this.position_arr = position_arr;

    const { bc_ref, br_ref } = this.get_node_bc_and_br(0);

    set_vertices_of_3d_cube(bc_ref, br_ref, position_arr);

    const position_attri = new three.BufferAttribute(position_arr, 3);
    this.position_attri = position_attri;
    const geometry = new three.BufferGeometry();

    geometry.setAttribute("position", position_attri);

    geometry.setIndex([
      0, 1, 2, 3, 0, 2, 1, 3, 4, 5, 6, 7, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7,
    ]);

    const material = new three.LineBasicMaterial({ color: 0x00ff00 });

    this.three_obj = new three.LineSegments(geometry, material);
  }

  /**
   *
   * @param {number} node_i
   * @returns {number[]}
   */
  get_next_node_idxs_ref(node_i) {
    return this.next_node_idx_lists[node_i];
  }

  /**
   *
   * @param {number} node_i
   * @returns {number[]}
   */
  get_contained_value_idxs_ref(node_i) {
    return this.contain_value_idx_lists[node_i];
  }

  /**
   *
   * @param {number} node_i
   * @returns {{
   *  br_ref: number,
   *  bc_ref: number[]
   * }}
   */
  get_node_bc_and_br(node_i) {
    const dim = this.barnes_hut_tree_obj.dim;
    const node_i3 = node_i * dim;
    return {
      br_ref: this.barnes_hut_tree_obj.brs[node_i],
      bc_ref: this.barnes_hut_tree_obj.bcs.slice(node_i3, node_i3 + dim),
    };
  }

  /**
   *
   * @param {number} value_idx
   */
  get_leaf_node_with_value_idx(value_idx) {
    return this.barnes_hut_tree_obj.to_leafs[value_idx];
  }

  /**
   *
   * @param {number} node_i
   */
  switch_to_node(node_i) {
    const { br_ref, bc_ref } = this.get_node_bc_and_br(node_i);
    set_vertices_of_3d_cube(bc_ref, br_ref, this.position_arr);
    this.position_attri.needsUpdate = true;
  }
}
