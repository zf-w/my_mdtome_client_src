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

import * as Three from "./three.js";

// Consts

const WINDOW_EVENT_FULLSCREEN_CHANGE_KEY = "fullscreenchange";
const WINDOW_EVENT_RESIZE_KEY = "resize";
const WINDOW_EVENT_SCROLL_KEY = "scroll";

const DOM_ELEM_EVENT_DOUBLE_CLICK_KEY = "dbclick";

const DOM_ELEM_INSERT_POS_AFTER_BEGIN_KEY = "afterbegin";

const HTML_TAG_CANVAS_NAME = "canvas";

// Configs

const MAX_FRAME_NUMBER_PER_SECOND = 60;
const MIN_FRAME_DURATION = 1000 / MAX_FRAME_NUMBER_PER_SECOND;

const ROOT_CANVAS_ID = "$root_canvas";
const ROOT_CANVAS_FULLSCREEN_CLASSNAME = "fullscreen_canvas";

/**
 * @param {HTMLElement} SceneInfo.html HTML Element
 */
export class SceneInfo {
  scene = new Three.Scene(); // Scene
  camera = new Three.PerspectiveCamera(); // PerspectiveCamera
  update_fn = undefined;
  first_render_flag = true;

  elem_bounding_box_info = undefined;
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
    this.elem_bounding_box_info = html.getBoundingClientRect();

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
    this.first_render_flag = false;
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

  root_canvas_mut_ref = undefined;
  root_canvas_bounding_box_info = undefined;

  constructor() {
    /**
     * @type {HTMLCanvasElement | undefined}
     */
    this.root_canvas_mut_ref = undefined;
    /**
     * @type {{canvas_ref: HTMLCanvasElement, scene_idxs_list: number[], renderer: Three.WebGLRenderer}}
     */
    this.fullscreen_state = undefined;
    /**
     * @type {SceneInfo[]}
     */
    this.scene_info_list = [];
  }

  handle_resize() {
    const renderer = this.renderer;

    // Update sizes
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Update renderer
    if (renderer != undefined) {
      renderer.setSize(width, height, false);

      for (let scene_i = 0; scene_i < this.scene_info_list.length; ++scene_i) {
        this.scene_info_list[scene_i].first_render_flag = true;
      }
      // renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    if (this.fullscreen_state) {
      this.fullscreen_state.renderer.setSize(width, height, false);
    }
  }

  handle_scroll() {
    this.root_canvas_bounding_box_info = this.root_canvas_mut_ref.getBoundingClientRect();
    for (let scene_i = 0; scene_i < this.scene_info_list.length; ++scene_i) {
        const scene_info_mut_ref = this.scene_info_list[scene_i];
        scene_info_mut_ref.elem_bounding_box_info = scene_info_mut_ref.html.getBoundingClientRect();
    }
  }

  /**
   *
   * @param {HTMLCanvasElement} root_canvas_mut_ref
   * @returns
   */
  init(root_canvas_mut_ref) {

    if (this.renderer != undefined) {
      return;
    }

    this.root_canvas_mut_ref = root_canvas_mut_ref;
    this.root_canvas_bounding_box_info = root_canvas_mut_ref.getBoundingClientRect();

    window.addEventListener(WINDOW_EVENT_RESIZE_KEY, () => {
      this.handle_resize();
      this.handle_scroll();
    });

    window.addEventListener(WINDOW_EVENT_SCROLL_KEY, () => {
        this.handle_scroll();
    });


    this.renderer = new Three.WebGLRenderer({
        alpha: true,
        canvas: root_canvas_mut_ref,
        powerPreference: "low-power"
    });
    // this.renderer.autoClear = true;
    this.handle_resize();
    const renderer = this.renderer;
    renderer.setScissorTest(true);

    let last_frame_time = performance.now();
    let frame_count = 0
    let frame_diff_sum = 0

    const tick = () => {

        const curr_frame_time = performance.now()

        const time_since_last_frame = curr_frame_time - last_frame_time;

        if (time_since_last_frame < MIN_FRAME_DURATION) {
            window.requestAnimationFrame(tick);
            return;
        }

        frame_diff_sum += time_since_last_frame;

        last_frame_time = curr_frame_time;
        frame_count += 1
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
   * @param {Three.WebGLRenderer} renderer
   * @param {SceneInfo} scene_info
   * @returns {void}
   */
  render_scene_info(renderer, scene_info) {
    const { 
        left: app_canvas_left_pos, 
        right: app_canvas_right_pos, 
        top: app_canvas_top_pos, 
        bottom: app_canvas_bottom_pos, 
        width: app_canvas_width, 
        height: app_canvas_height 
    } = scene_info.elem_bounding_box_info;

    const root_canvas_bounding_box_info = this.root_canvas_bounding_box_info;
    const root_canvas_height = root_canvas_bounding_box_info.height;
    const root_canvas_width = root_canvas_bounding_box_info.width;

    if (app_canvas_bottom_pos < 0 || 
        app_canvas_top_pos > root_canvas_height || 
        app_canvas_right_pos < 0 || 
        app_canvas_left_pos > root_canvas_width
    ) {
      return;
    }

    const app_canvas_abs_top_pos = root_canvas_height - app_canvas_bottom_pos;
    
    if (scene_info.first_render_flag == true) {
      scene_info.update_camera(app_canvas_width, app_canvas_height);
    }

    if (scene_info.update) {
      scene_info.update();
    }

    renderer.setScissor(app_canvas_left_pos, app_canvas_abs_top_pos, app_canvas_width + 1, app_canvas_height + 1);

    renderer.setViewport(app_canvas_left_pos, app_canvas_abs_top_pos, app_canvas_width + 1, app_canvas_height + 1);

    renderer.render(scene_info.scene, scene_info.camera);
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

  /**
   *
   * @param {SceneInfo} scene_info
   * @returns {number} added scene's index
   */
  add(scene_info) {
    this.scene_info_list.push(scene_info);
    const index = this.total;
    this.total += 1;
    return index;
  }

  /**
   *
   * @param {number[]} scene_idxs_list
   * @param {HTMLElement} app_root_elem
   * @returns
   */
  prepare_fullscreen(scene_idxs_list, app_root_elem) {
    let is_fullscreen_flag = false;
    let san_exiting_full_callback = undefined;
    let fullscreen_change_callback = () => {
      if (is_fullscreen_flag == false) {
        san_exiting_full_callback = this.go_fullscreen(
          scene_idxs_list,
          app_root_elem
        );

        is_fullscreen_flag = true;

      } else {
        window.removeEventListener(
          WINDOW_EVENT_FULLSCREEN_CHANGE_KEY,
          fullscreen_change_callback
        );
        san_exiting_full_callback();
        san_exiting_full_callback = undefined;

        window.exitFullscreen().catch((e) => {
          console.log("Using 'esc' to exit fullscreen.");
        });

        is_fullscreen_flag = false;
      }
    };

    app_root_elem.addEventListener(DOM_ELEM_EVENT_DOUBLE_CLICK_KEY, (event) => {
      event.preventDefault();
      if (event.ctrlKey != true) {
        return;
      }

      if (is_fullscreen_flag == true) {
        // console.log("Exiting fullscreen");

        fullscreen_change_callback();
      } else {
        // console.log(curr_scene_info_i, canvas_elem);

        app_root_elem.requestFullscreen();
        window.addEventListener(
          WINDOW_EVENT_FULLSCREEN_CHANGE_KEY,
          fullscreen_change_callback
        );
      }
    });
  }

  /**
   * @private
   * @param {number[]} scene_idxs_list
   * @param {HTMLElement} app_root_elem
   * @returns
   */
  go_fullscreen(scene_idxs_list, app_root_elem) {
    // console.log("[San] Making fullscreen");
    const canvas_elem = document.createElement(HTML_TAG_CANVAS_NAME);
    app_root_elem.insertAdjacentElement(DOM_ELEM_INSERT_POS_AFTER_BEGIN_KEY, canvas_elem);
    canvas_elem.classList.toggle(ROOT_CANVAS_FULLSCREEN_CLASSNAME);

    for (let i = 0; i < scene_idxs_list.length; ++i) {
      const scene_i = scene_idxs_list[i];
      this.scene_info_list[scene_i].first_render_flag = true;
    }
    let width = window.innerWidth;
    let height = window.innerHeight;

    const renderer = new Three.WebGLRenderer({
      canvas: canvas_elem,
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
    this.root_canvas_mut_ref = undefined;
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

try {
  const root_canvas = document.getElementById(ROOT_CANVAS_ID);
  const san_context = new San();
  san_context.init(root_canvas);
  window.mdtome.san_context = san_context;
} catch {
  console.error("Failed to create the root canvas");
}
