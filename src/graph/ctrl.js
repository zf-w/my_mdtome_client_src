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

import * as Three from "three"

const VERT_SHADER = /* glsl */ `
uniform float uPixelRatio;
attribute vec3 color;
attribute float size;
varying vec3 vColor;

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;
    gl_PointSize = 2.0 * size * uPixelRatio;
    // gl_PointSize *= (1.0 / - viewPosition.z);

    vColor = color;
}
`
const FRAG_SHADER = /* glsl */ `
varying vec3 vColor;

void main()
{    
    gl_FragColor = vec4(vColor, 1.0);
}`


/**
 * 
 * @param {{data: number[], dim: number}} position 
 * @returns 
 */
export function position_to_dim_3_array(position) {
    const dim = position.dim
    const len = Math.floor(position.data.length / dim)
    const pos_arr = new Float32Array(len * 3)
    const pos_list = position.data

    if (dim == 2) {
        for (let i = 0; i < len; ++i) {
            const i2 = i * 2
            const i3 = i * 3
            pos_arr[i3] = pos_list[i2]
            pos_arr[i3 + 1] = pos_list[i2 + 1]
        }
    } else {
        for (let i = 0; i < len; ++i) {
            const id = i * dim
            const i3 = i * 3
            pos_arr[i3] = pos_list[id]
            pos_arr[i3 + 1] = pos_list[id + 1]
            pos_arr[i3 + 2] = pos_list[id + 2]
        }
    }
    return pos_arr
}

export function center_position(pos_arr) {
    const dim = 3
    const len = Math.floor(pos_arr.length / dim)
    const center = [0, 0, 0]

    for (let i = 0; i < len; ++i) {
        for (let d = 0; d < dim; ++d) {
            center[d] += pos_arr[i * dim + d] / len
        }
    }
    for (let i = 0; i < len; ++i) {
        for (let d = 0; d < dim; ++d) {
            pos_arr[i * dim + d] -= center[d]
        }
    }
}

export function scale_position(pos_arr) {
    const dim = 3
    const len = Math.floor(pos_arr.length / dim)
    let r = 0.0001
    for (let i = 0; i < len; ++i) {
        let curr_r = 0
        for (let d = 0; d < dim; ++d) {
            const curr_pos = pos_arr[i * dim + d]
            curr_r += curr_pos * curr_pos
        }
        if (r < curr_r) {
            r = curr_r
        }
    }
    r = Math.pow(r, 0.5)
    for (let i = 0; i < len; ++i) {
        for (let d = 0; d < dim; ++d) {
            pos_arr[i * dim + d] /= r
        }
    }
}

export class GraphController {
    size
    obj = new Three.Group()

    node_geometry= new Three.BufferGeometry()
    node_material = new Three.ShaderMaterial({
        vertexShader: VERT_SHADER,
        fragmentShader: FRAG_SHADER,
        uniforms: {
            uPixelRatio: { value: 1.5 },
        },
    })

    edge_i_attri
    edge_geometry= new Three.BufferGeometry()
    edge_material = new Three.LineBasicMaterial({
        vertexColors: true,
    })

    edge_map = new Map()
    edge_draw_end

    h3 = new Three.Vector3()

    /**
     * 
     * @param {{position: {dim: number, data: number[]}, index: number[]}} graph 
     */
    constructor(graph) {
        // console.log('Graph Controller building')
        const pos_dim = 3
        const color_dim = 3 // The itemsize for positions and colors
        this.size = Math.floor(graph.position.data.length / graph.position.dim)
        const position_arr = position_to_dim_3_array(graph.position)
        center_position(position_arr)
        scale_position(position_arr)
        const size = this.size
        const node_p_array = new Float32Array(position_arr)
        const node_c_array = new Float32Array(size * color_dim)
        const node_s_array = new Float32Array(size)
        const node_p_attri = new Three.BufferAttribute(node_p_array, pos_dim)
        const node_s_attri = new Three.BufferAttribute(node_s_array, 1)
        const node_c_attri = new Three.BufferAttribute(node_c_array, pos_dim)

        const node_geometry = this.node_geometry
        node_geometry.setAttribute("position", node_p_attri)
        node_geometry.setAttribute("color", node_c_attri)
        node_geometry.setAttribute("size", node_s_attri)

        this.obj.add(new Three.Points(node_geometry, this.node_material))

        const indices = graph.index
        const edge_size = Math.floor(indices.length / 2)
        const edge_p_array = new Float32Array(edge_size * 2 * pos_dim)
        const edge_c_array = new Float32Array(edge_size * 2 * color_dim)
        const edge_i_array = new Uint32Array(edge_size * 2)

        const helper = this.h3

        for (let i2 = 0; i2 < indices.length; i2 += 2) {
            const idx0 = indices[i2]
            const idx1 = indices[i2 + 1]

            // Copying positions from nodeice positions
            helper.fromArray(node_p_array, idx0 * pos_dim)
            helper.toArray(edge_p_array, i2 * pos_dim)
            helper.fromArray(node_p_array, idx1 * pos_dim)
            helper.toArray(edge_p_array, i2 * pos_dim + pos_dim)

            // Setting up colors (should default be zero)
            helper.fromArray([0, 0, 0], 0)
            helper.toArray(edge_c_array, i2 * color_dim + color_dim)
            helper.fromArray([0.0, 1.0, 0.0], 0)
            helper.toArray(edge_c_array, i2 * color_dim)

            edge_i_array[i2] = i2
            edge_i_array[i2 + 1] = i2 + 1
        }
        const edge_geometry = this.edge_geometry
        const edge_color_attri = new Three.BufferAttribute(
            edge_c_array,
            color_dim
        )
        edge_geometry.setAttribute(
            "position",
            new Three.BufferAttribute(edge_p_array, pos_dim)
        )
        edge_geometry.setAttribute("color", edge_color_attri)

        this.edge_i_attri = new Three.BufferAttribute(edge_i_array, 1)
        const edge_i_attri = this.edge_i_attri
        edge_i_attri.name = "Edge indices attribute."
        edge_geometry.setIndex(edge_i_attri)

        this.edge_draw_end = 0
        edge_geometry.setDrawRange(0, this.edge_draw_end)

        this.obj.add(new Three.LineSegments(edge_geometry, this.edge_material))
    }

    get_node_pos(i) {
        return new Three.Vector3().fromArray(
            this.node_geometry.getAttribute("position").array,
            i * 3
        )
    }

    set_node_size(i, s) {
        const node_s_attri = this.node_geometry.getAttribute("size")
        const node_s_array = node_s_attri.array
        node_s_array[i] = s
        node_s_attri.needsUpdate = true
    }

    set_node_color(i, v3) {
        const Dim = 3
        const node_c_attri = this.node_geometry.getAttribute("color")
        const node_c_array = node_c_attri.array

        v3.toArray(node_c_array, i * Dim)
        node_c_attri.needsUpdate = true
    }

    show_edge(i) {
        const edge_map = this.edge_map

        if (edge_map.has(i) == true) {
            return
        }
        const edge_i_attri = this.edge_i_attri
        const edge_i_array = edge_i_attri.array
        const end = this.edge_draw_end
        const i2 = i * 2
        edge_map.set(i, end)
        edge_i_array[end] = i2
        edge_i_array[end + 1] = i2 + 1
        this.edge_draw_end += 2
        this.edge_geometry.setDrawRange(0, this.edge_draw_end)
        edge_i_attri.needsUpdate = true
    }

    hide_edge(i) {
        const edge_map = this.edge_map

        if (edge_map.has(i) == false) {
            return
        }
        const edge_idx = edge_map.get(i)
        const edge_i_attri = this.edge_i_attri
        const edge_i_array = edge_i_attri.array
        const end = this.edge_draw_end
        edge_i_array[edge_idx] = edge_i_array[end - 2]
        edge_i_array[edge_idx + 1] = edge_i_array[end - 1]
        edge_i_array[end - 2] = 0
        edge_i_array[end - 1] = 0
        edge_map.delete(i)
        this.edge_draw_end -= 2
        edge_i_attri.needsUpdate = true
        this.edge_geometry.setDrawRange(0, this.edge_draw_end)
    }

    set_edge_visibility(edge_i, visible) {
        if (visible) {
            this.show_edge(edge_i)
        } else {
            this.hide_edge(edge_i)
        }
    }

    set_edge_color(edge_i, first, c3) {
        const c_dim = 3
        const edge_c_attri = this.edge_geometry.getAttribute("color")
        const edge_c_array = edge_c_attri.array

        if (first) {
            c3.toArray(edge_c_array, edge_i * 2 * c_dim)
        } else {
            c3.toArray(edge_c_array, edge_i * 2 * c_dim + c_dim)
        }
        edge_c_attri.needsUpdate = true
    }

    dispose() {
        // console.log('Graph Controller disposing')
        this.edge_geometry.dispose()
        this.edge_material.dispose()
        this.node_geometry.dispose()
        this.node_material.dispose()
    }
}
