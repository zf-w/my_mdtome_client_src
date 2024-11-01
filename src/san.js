/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * San.js: Utilities for Multi-Scene One-Canvas with Three.js and others
 * Copyright (C) 2024  Zhifeng Wang 王之枫
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3 of the License only.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as Three from "three";

/**
 * @param {HTMLElement} SceneInfo.html HTML Element
 */
export class SceneInfo {
  scene = new Three.Scene(); // Scene
  camera = new Three.PerspectiveCamera(); // PerspectiveCamera
  update_fn = undefined;
  first = true;
  /**
   *
   * @param {HTMLElement} html
   * @param {*} scene
   * @param {*} camera
   * @param {*} update
   */
  constructor(html, scene, camera, update = undefined) {
    /**
     * @type {HTMLElement}
     */
    this.html = html;
    /**
     * @type {Three.Scene}
     */
    this.scene = scene;
    this.camera = camera;
    this.update_fn = update;
    this.keep = true;
  }
  /**
   *
   * @param {number} w
   * @param {number} h
   */
  update_camera(w, h) {
    const camera = this.camera;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    this.first = false;
  }

  update() {
    if (this.update_fn) {
      this.update_fn();
    }
  }
}

export class San {
  renderer = undefined;
  dirty = false;
  empty_scene = new Three.Scene();
  empty_camera = new Three.PerspectiveCamera();
  total = 0;

  constructor() {
    /**
     * @type {HTMLCanvasElement | undefined}
     */
    this.canvas_mut_ref = undefined;
    /**
     * @type {{canvas_ref: HTMLCanvasElement, scene_idxs_list: number[], renderer: Three.WebGLRenderer}}
     */
    this.fullscreen_state = undefined;
    /**
     * @type {SceneInfo[]}
     */
    this.scene_info_list = [];
  }

  /**
   * @param {Three.WebGLRenderer} renderer
   * @param {SceneInfo} scene_info
   * @returns {void}
   */
  render_scene_info(renderer, scene_info) {
    const { left, right, top, bottom, width, height } =
      scene_info.html.getBoundingClientRect();

    let parent = this.canvas_mut_ref.getBoundingClientRect();
    const tHeight = parent.height;
    const tWidth = parent.width;
    if (bottom < 0 || top > tHeight || right < 0 || left > tWidth) {
      return;
    }
    // console.log(left, right, top, bottom, height, width);
    //
    const yTop = tHeight - bottom;
    // console.log(yTop);
    if (scene_info.first == true) {
      scene_info.update_camera(width, height);
    }

    if (scene_info.update) {
      scene_info.update();
    }

    // this.renderer?.setScissorTest(true)
    // if (this.fullscreen_state == undefined) {
    renderer.setScissor(left, yTop, width + 1, height + 1);
    //this.renderer.setViewport(0,0,100,100);
    renderer.setViewport(left, yTop, width + 1, height + 1);
    // }

    //console.log(scene_info.scene.children.length);
    renderer.render(scene_info.scene, scene_info.camera);
    // this.renderer?.clear()
    // this.renderer?.setScissorTest(false)
  }

  render() {
    if (this.renderer == undefined) {
      return;
    }
    if (this.dirty) {
      this.renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
      this.renderer.render(this.empty_scene, this.empty_camera);
      this.dirty = false;
    }
    // this.renderer?.render(this.empty_scene, this.empty_camera)
    for (let i = 0; i < this.scene_info_list.length; ++i) {
      const curr_scene = this.scene_info_list[i];
      if (curr_scene.keep) {
        this.render_scene_info(this.renderer, curr_scene);
        this.dirty = true;
      } else {
        // Render an empty one first to clear out the remains?
        curr_scene.scene = this.empty_scene;
        // scene.clear()
        // scene.background = new Color(0x00000000)
        this.render_scene_info(this.renderer, curr_scene);
        this.scene_info_list.splice(i, 1);
      }
    }
  }

  fullscreen_render() {
    const fullscreen_state = this.fullscreen_state;
    if (fullscreen_state == undefined) {
      return;
    }
    const renderer_ref = this.fullscreen_state.renderer;
    const need_render_idxs = this.fullscreen_state.scene_idxs_list;
    for (let i = 0; i < need_render_idxs.length; ++i) {
      const need_render_idx = need_render_idxs[i];
      const curr_scene = this.scene_info_list[need_render_idx];
      if (curr_scene.keep) {
        this.render_scene_info(renderer_ref, curr_scene);
        this.dirty = true;
      } else {
        // Render an empty one first to clear out the remains?
        curr_scene.scene = this.empty_scene;
        // scene.clear()
        // scene.background = new Color(0x00000000)
        this.render_scene_info(renderer_ref, curr_scene);
        this.scene_info_list.splice(i, 1);
      }
    }
  }

  handle_resize() {
    const renderer = this.renderer;

    // Update sizes
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Update renderer
    if (renderer != undefined) {
      renderer.setSize(width, height, false);

      for (let i = 0; i < this.scene_info_list.length; ++i) {
        this.scene_info_list[i].first = true;
      }
      // renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    if (this.fullscreen_state) {
      this.fullscreen_state.renderer.setSize(width, height, false);
    }
  }

  /**
   *
   * @param {HTMLCanvasElement} canvas_mut_ref
   * @returns
   */
  init(canvas_mut_ref) {
    window.addEventListener("resize", () => {
      this.handle_resize();
    });
    if (this.renderer != undefined) {
      return;
    }
    this.canvas_mut_ref = canvas_mut_ref;
    this.renderer = new Three.WebGLRenderer({
      canvas: canvas_mut_ref,
      antialias: true,
      alpha: true,
    });
    // this.renderer.autoClear = true;
    this.handle_resize();
    const renderer = this.renderer;
    renderer.setScissorTest(true);
    // const updator = this.updator

    // AddGraphSet(scene, updator)
    const tick = () => {
      // Call tick again on the next frame
      if (this.fullscreen_state) {
        // console.log("[San] fullscreen rendering");
        this.fullscreen_render();
      } else {
        this.render();
      }

      window.requestAnimationFrame(tick);
    };

    tick();
  }

  /**
   *
   * @param {SceneInfo} scene_info
   * @returns {number} added scene's index
   */
  add(scene_info) {
    // console.log('Adding')

    this.scene_info_list.push(scene_info);
    const index = this.total;
    this.total += 1;
    return index;
  }
  /**
   *
   * @param {number[]} scene_idxs_list
   * @param {HTMLElement} mod_root_elem
   * @returns
   */
  prepare_fullscreen(scene_idxs_list, mod_root_elem) {
    let is_fullscreen_flag = false;
    let san_exiting_full_callback = undefined;
    let fullscreen_change_callback = () => {
      if (is_fullscreen_flag == false) {
        san_exiting_full_callback = this.go_fullscreen(
          scene_idxs_list,
          mod_root_elem
        );

        is_fullscreen_flag = true;

        // console.log("[San:change_callback] Fullscreen done");
      } else {
        document.removeEventListener(
          "fullscreenchange",
          fullscreen_change_callback
        );
        san_exiting_full_callback();
        san_exiting_full_callback = undefined;

        document.exitFullscreen().catch((e) => {
          console.log("Using 'esc' to exit fullscreen.");
        });

        is_fullscreen_flag = false;
        // console.log("[San:change_callback] Removing");
      }
    };
    mod_root_elem.addEventListener("dblclick", (event) => {
      event.preventDefault();
      if (event.ctrlKey != true) {
        return;
      }

      if (is_fullscreen_flag == true) {
        // console.log("Exiting fullscreen");

        fullscreen_change_callback();
      } else {
        // console.log(curr_scene_info_i, canvas_elem);

        mod_root_elem.requestFullscreen();
        document.addEventListener(
          "fullscreenchange",
          fullscreen_change_callback
        );
      }
    });
  }

  /**
   * @private
   * @param {number[]} scene_idxs_list
   * @param {HTMLElement} mod_root_elem
   * @returns
   */
  go_fullscreen(scene_idxs_list, mod_root_elem) {
    // console.log("[San] Making fullscreen");
    const canvas_elem = document.createElement("canvas");
    mod_root_elem.insertAdjacentElement("afterbegin", canvas_elem);
    canvas_elem.classList.toggle("fullscreen_canvas");

    for (let i = 0; i < scene_idxs_list.length; ++i) {
      const scene_i = scene_idxs_list[i];
      this.scene_info_list[scene_i].first = true;
    }
    let width = window.innerWidth;
    let height = window.innerHeight;
    const renderer = new Three.WebGLRenderer({
      canvas: canvas_elem,
      antialias: true,
      alpha: true,
    });
    renderer.setScissorTest(true);
    renderer.setSize(width, height, false);
    this.fullscreen_state = {
      renderer,
      scene_idxs_list,
      canvas_ref: canvas_elem,
    };
    return () => {
      //   console.log("[San] Disposing fullscreen renderer");
      const fullscreen_renderer = this.fullscreen_state.renderer;
      fullscreen_renderer.render(this.empty_scene, this.empty_camera);
      fullscreen_renderer.dispose();
      canvas_elem.remove();
      this.fullscreen_state = undefined;
    };
  }

  dispose() {
    this.renderer.dispose();
    this.renderer = undefined;
    this.canvas_mut_ref = undefined;
  }
}

export function set_perspective_camera_from_param(camera, camera_param) {
  if (camera_param != undefined) {
    if (camera_param.z != undefined) {
      camera.position.z = camera_param.z;
    }
  }
}
/**
 *
 * @param {OrbitControl} orbit_ctrl
 * @param {{
 *  allow_pan: boolean,
 *  allow_zoom: boolean,
 *  auto_rotate_speed: number,
 * }} orbit_ctrl_param
 */
export function set_orbit_ctrl_from_param(orbit_ctrl, orbit_ctrl_param) {
  if (orbit_ctrl_param != undefined) {
    const auto_rotate_speed = orbit_ctrl_param.auto_rotate_speed;
    if (auto_rotate_speed == 0) {
      orbit_ctrl.autoRotate = false;
    } else {
      orbit_ctrl.autoRotate = true;
      orbit_ctrl.autoRotateSpeed = auto_rotate_speed;
    }
    if (orbit_ctrl_param.allow_pan != undefined) {
      orbit_ctrl.allowPan = orbit_ctrl_param.allow_pan;
    }
    if (orbit_ctrl_param.allow_zoom != undefined) {
      orbit_ctrl.allowZoom = orbit_ctrl_param.allow_zoom;
    }
  }
}

const ROOT_CANVAS_ID = "$root_canvas";

try {
  const root_canvas = document.getElementById(ROOT_CANVAS_ID);
  const san_context = new San();
  san_context.init(root_canvas);
  window.mdtome.san_context = san_context;
} catch {
  console.error("Failed to create the root canvas");
}
