import * as Three from 'three'

export function build_index_and_node_edge_adj_from_actions_map(
    actions
) {
    let ans_index = []
    let ans_adj = []
    let edge_len = 0
    for (let curr_node_i = 0; curr_node_i < actions.length; ++curr_node_i) {
        const curr_nexts = actions[curr_node_i]
        const ans_nexts = []
        for (let action_i = 0; action_i < curr_nexts.length; ++action_i) {
            const [action, next_node_i, flip] = curr_nexts[action_i]
            ans_index.push(curr_node_i)
            ans_index.push(next_node_i)
            ans_nexts.push([action - 1, next_node_i, edge_len, flip])
            edge_len += 1
        }
        ans_adj.push(ans_nexts)
    }

    return [ans_index, ans_adj]
}

function get_rgb_from_hex(hex) {
    const r = Math.floor(hex / 65536)
    const g = Math.floor((hex % 65536) / 256)
    const b = Math.floor(hex % 256)
    return [r, g, b]
}

export class ColorMap {
    color_i
    color_rgb 
    constructor(color_map) {
        this.color_i = color_map.color_i
        this.color_rgb = color_map.color_rgb
    }

    get_color(color_i) {
        let prev_i = 0
        let curr_i = 1
        let prev_color_i = this.color_i[prev_i]
        if (color_i < prev_color_i) {
            return this.color_rgb[prev_i]
        }
        for (; curr_i < this.color_i.length; ++curr_i) {
            // Binary Search in the future
            const curr_color_i = this.color_i[curr_i]

            if (color_i >= prev_color_i && color_i < curr_color_i) {
                const range = curr_color_i - prev_color_i
                const prev_ratio = (curr_color_i - color_i) / range
                const curr_ratio = (color_i - prev_color_i) / range
                const [prev_r, prev_g, prev_b] = get_rgb_from_hex(
                    this.color_rgb[prev_i]
                )
                const [curr_r, curr_g, curr_b] = get_rgb_from_hex(
                    this.color_rgb[curr_i]
                )
                return (
                    Math.round(prev_r * prev_ratio + curr_r * curr_ratio) *
                        65536 +
                    Math.round(prev_g * prev_ratio + curr_g * curr_ratio) *
                        256 +
                    Math.round(prev_b * prev_ratio + curr_b * curr_ratio)
                )
            }
            prev_i = curr_i
            prev_color_i = curr_color_i
        }
        return this.color_rgb[prev_i]
    }
}

function get_next_node_i_from_actions(
    self,
    node_i,
    action
) {
    if (node_i >= self.length) {
        return undefined
    }
    const curr_nexts = self[node_i]

    for (let action_i = 0; action_i < curr_nexts.length; ++action_i) {
        const [curr_action, curr_next_i, curr_edge_i, flip] =
            curr_nexts[action_i]
        if (curr_action == action) {
            return [curr_next_i, curr_edge_i, flip]
        }
    }
    return undefined
}

export function draw_graph(
    graph_ctrl, game_ctrl,
    action_node_edge_adj,
    following_actions,
    show
    // graph_game
) {
    let prev_node_i = 0
    let curr_node_i
    let flip = false
    for (let action_i = 0; action_i < following_actions.length; ++action_i) {
        let res_action = following_actions[action_i]
        if (flip) {
            res_action = game_ctrl.flip(res_action)
        }
        const curr_node_opt = get_next_node_i_from_actions(
            action_node_edge_adj,
            prev_node_i,
            res_action
        )
        if (curr_node_opt == undefined) {
            return
        }
        let curr_edge_i
        let next_flip
        ;[curr_node_i, curr_edge_i, next_flip] = curr_node_opt
        // if (graph_game) {
        //     console.log(graph_game.nodes.colors.colors[curr_node_i], flip)
        // }
        if (show) {
            // graph_ctrl.set_edge_color(curr_edge_i, true, red)
            graph_ctrl.show_edge(curr_edge_i)
        } else {
            graph_ctrl.hide_edge(curr_edge_i)
        }
        flip = flip != (next_flip == 1)
        prev_node_i = curr_node_i
    }
}

export function calc_target_result(
    game_ctrl,
    action_node_edge_adj,
    game_graph,
    following_actions,
) {
    const ans_nexts = []

    let prev_node_i = 0
    let curr_node_i
    let flip = false
    const len = following_actions.length
    let action_i = 0
    let first_hand = true
    for (; action_i < len; ++action_i) {
        let res_action = following_actions[action_i]
        if (flip) {
            res_action = game_ctrl.flip(res_action)
        }
        const curr_node_opt = get_next_node_i_from_actions(
            action_node_edge_adj,
            prev_node_i,
            res_action
        )
        if (curr_node_opt == undefined) {
            return undefined
        }
        let next_flip
        ;[curr_node_i, , next_flip] = curr_node_opt

        flip = flip != (next_flip == 1)
        prev_node_i = curr_node_i
        first_hand = !first_hand
    }

    let prev_nexts = action_node_edge_adj[prev_node_i]
    for (let next_i = 0; next_i < prev_nexts.length; ++next_i) {
        let [res_action, next_node_i] = prev_nexts[next_i]
        if (flip) {
            res_action = game_ctrl.flip(res_action)
        }
        let s = game_graph.nodes.colors.colors[next_node_i]
        if (first_hand) {
            s = -s
        }
        ans_nexts.push({ a: res_action, s, c: 0, ac: 0 })
    }
    if (ans_nexts.length == 0) {
        return undefined
    }
    let curr_s = game_graph.nodes.colors.colors[prev_node_i]
    if (!first_hand) {
        curr_s = -curr_s
    }
    return {
        s: curr_s,
        c: 0,
        ac: 0,
        nexts: ans_nexts,
    }
}

export function calc_target_position(
    graph_ctrl,
    game_ctrl,
    action_node_edge_adj,
    following_actions,
    target
) {
    let prev_node_i = 0
    let curr_node_i
    let flip = false

    target.copy(graph_ctrl.get_node_pos(prev_node_i))

    const len = following_actions.length
    for (let action_i = 0; action_i < len; ++action_i) {
        let res_action = following_actions[action_i]
        if (flip) {
            res_action = game_ctrl.flip(res_action)
        }
        const curr_node_opt = get_next_node_i_from_actions(
            action_node_edge_adj,
            prev_node_i,
            res_action
        )
        if (curr_node_opt == undefined) {
            target.multiplyScalar(1 / (action_i + 1))
            return
        }

        let next_flip
        ;[curr_node_i, , next_flip] = curr_node_opt
        target.add(graph_ctrl.get_node_pos(curr_node_i))
        flip = flip != (next_flip == 1)
        prev_node_i = curr_node_i
    }
    target.multiplyScalar(1 / (len + 1))
}

export function init_graph_with_game_graph(
    graph_ctrl,
    game_graph,
    action_node_edge_adj
) {
    const node_color_map = new ColorMap(game_graph.nodes.colors.colormap)
    const color_idxs = game_graph.nodes.colors.colors
    for (let node_i = 0; node_i < color_idxs.length; ++node_i) {
        const curr_color_i = color_idxs[node_i]
        graph_ctrl.set_node_color(
            node_i,
            new Three.Color(node_color_map.get_color(curr_color_i))
        )
        graph_ctrl.set_node_size(node_i, Math.abs(curr_color_i) / 18 + 0.5)
    }
    const actions = action_node_edge_adj
    for (let curr_node_i = 0; curr_node_i < actions.length; ++curr_node_i) {
        const curr_nexts = actions[curr_node_i]

        for (let action_i = 0; action_i < curr_nexts.length; ++action_i) {
            const [action, next_node_i, edge_i, flip] = curr_nexts[action_i]
            const curr_color_i = color_idxs[next_node_i]
            graph_ctrl.set_edge_color(
                edge_i,
                true,
                new Three.Color(node_color_map.get_color(curr_color_i))
            )
        }
    }
}
