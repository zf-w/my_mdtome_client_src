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

import * as con4 from "con4"
import * as con4_game from "con4_game"
import * as con4_graph_util from "con4_graph_util"
import * as graph_ctrl_mod from "graph_ctrl"
import * as three from "three"
import * as san from "san"

function make_graph_part_id(elem_id) {
    return `${elem_id}_graph`
}

function render_with_game_graph(elem_id,game_graph, param) {
    const look_at_target_vec3 = new three.Vector3(0,0,0)
    const [graph_index, action_node_edge_adj] = con4_graph_util.build_index_and_node_edge_adj_from_actions_map(
        game_graph.actions
    )

    const {api_url, following_actions_string} = param
    const following_actions_list = con4.actions_string_to_list(following_actions_string)

    const {w, h, start: base_actions_list} = game_graph.game
    const game_ctrl = {flip: (action) => {
        return w - 1 - action
    }}

    const graph_ctrl = new graph_ctrl_mod.GraphController({index: graph_index, position: game_graph.position, slug: `Graph Game: ${elem_id}`})
    con4_graph_util.init_graph_with_game_graph(graph_ctrl, game_graph, action_node_edge_adj)

    const elem_mut_ref = document.getElementById(elem_id)
    const graph_part_id = make_graph_part_id(elem_id)


    const [game_elem_string, game_elem_util] = con4_game.make_con4_game_inner_string(elem_id, w, h, base_actions_list, following_actions_list)
    elem_mut_ref.innerHTML = `<section id=${graph_part_id} class="con4_graph_graph"></section><section class="con4_graph_wrapper">${game_elem_string}</section>`

    const graph_elem_mut_ref = document.getElementById(graph_part_id)
    const scene = new three.Scene()
    scene.add(graph_ctrl.obj)

    const camera = new three.PerspectiveCamera(75, 1.0, 0.01, 10)
    camera.position.z = 1.0
    if (param.camera_param != undefined) {
        san.set_perspective_camera_from_param(camera, param.camera_param)
    }
    const control = new three.OrbitControls(camera, graph_elem_mut_ref)
    if (param.orbit_ctrl_param != undefined) {
        san.set_orbit_ctrl_from_param(control, param.orbit_ctrl_param)
    }

    control.target = look_at_target_vec3

    let last_update = Date.now()
    const scene_info = new san.SceneInfo(
        graph_elem_mut_ref,
        scene,
        camera,
        () => {
            let now = Date.now()
            control.update((now - last_update) / 1000)
            last_update = now
        }
    )

    window.mdbook.san_context.add(scene_info)

    const core = {w, h, elem_mut_ref, api_url, base_actions_list, following_actions_list, utils: game_elem_util}


    let clear_graph;
    const render_graph = (following_actions_list, imagine_action) => {
        const actions_list = con4.collect_actions(base_actions_list, following_actions_list, imagine_action)
        if (clear_graph != undefined) {
            clear_graph()
        }
        con4_graph_util.draw_graph(
            graph_ctrl,game_ctrl,
            action_node_edge_adj,
            actions_list,
            true
        )
        con4_graph_util.calc_target_position(
            graph_ctrl,
            game_ctrl,
            action_node_edge_adj,
            actions_list,
            look_at_target_vec3
        )
        clear_graph = () => {
            con4_graph_util.draw_graph(
                graph_ctrl,game_ctrl,
                action_node_edge_adj,
                actions_list,
                false
            )
        }
    }

    const {play_fn, undo_fn, imagine_fn, fetch_fn} = con4_game.make_con4_game_logic_callbacks(core, render_graph, (base_actions_list, following_actions_list) => {
        return con4_graph_util.calc_target_result(game_ctrl,
            action_node_edge_adj,
            game_graph,
            following_actions_list,)
    })

    con4_game.add_listeners_to_con4_game_ctrl(elem_id, w, play_fn, undo_fn, imagine_fn)

    render_graph(following_actions_list, undefined)
    fetch_fn()
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
export function render(elem_id, param) {
    let res = window.mdbook.fetch_static_json_helper(param.load[0])
    if (res.data != undefined) {
        render_with_game_graph(elem_id,res.param, param)
    } else {
        res.promise.then((game_graph)=>{
            render_with_game_graph(elem_id,game_graph, param)
        }).catch((err_msg) => {
            console.log(err_msg)
        })
    }
}