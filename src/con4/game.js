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
import * as con4_board from "con4_board";

const HIDDEN_CLASSNAME = "hidden";
const LOADING_CLASSNAME = "con4_game_loading";

function make_play_ctrl_btn_elem_id(root_elem_id, i) {
  return `${root_elem_id}_play_${i}`;
}

function make_play_ctrl_elem_id(root_elem_id, i) {
  return `${root_elem_id}_play_ctrl_${i}`;
}

function make_play_ctrl_score_elem_id(root_elem_id, i) {
  return `${root_elem_id}_play_score_${i}`;
}

function make_undo_btn_id(root_elem_id) {
  return `${root_elem_id}_undo_btn`;
}

export function make_con4_game_inner_string(
  elem_id,
  w,
  h,
  base_actions_list,
  following_actions_list
) {
  const heights = new Uint8Array(w);
  const play_ctrl_elems_hidden_flags = [];
  const play_ctrl_elems_ids = [];
  const play_ctrl_score_elems_ids = [];
  const actions_list = con4.collect_actions(
    base_actions_list,
    following_actions_list,
    undefined
  );

  for (let i = 0; i < actions_list.length; ++i) {
    heights[actions_list[i]] += 1;
  }
  for (let i = 0; i < w; ++i) {
    if (heights[i] < h) {
      play_ctrl_elems_hidden_flags.push(false);
    } else {
      play_ctrl_elems_hidden_flags.push(true);
    }
    play_ctrl_elems_ids.push(make_play_ctrl_elem_id(elem_id, i));
    play_ctrl_score_elems_ids.push(make_play_ctrl_score_elem_id(elem_id, i));
  }

  const board_id = `${elem_id}_board`;
  const undo_btn_id = make_undo_btn_id(elem_id);

  const col_off_num = 100 / w;
  const play_ctrl_btns_strings = [];
  for (let i = 0; i < w; ++i) {
    const hidden_class = heights[i] < h ? "" : HIDDEN_CLASSNAME;
    play_ctrl_btns_strings.push(
      `<div id=${
        play_ctrl_elems_ids[i]
      } class="con4_game_play_ctrl ${hidden_class}" style="width:${col_off_num}%;"><button id="${make_play_ctrl_btn_elem_id(
        elem_id,
        i
      )}" class="con4_game_btn" >play</button><div id=${make_play_ctrl_score_elem_id(
        elem_id,
        i
      )}>0</div></div>`
    ); //left:${i * col_off_num}%
  }
  return [
    `${con4_board.make_board_with_wrapper_elem_string(
      actions_list,
      w,
      h,
      board_id
    )}
<section class="con4_game_ctrl_root">
    <div class="con4_game_play_row">
    ${"".concat(...play_ctrl_btns_strings)}
    </div>
    <div class="con4_game_ctrl_1_row">
        <button id=${undo_btn_id} class="con4_game_btn${
      following_actions_list.length == 0 ? " hidden" : ""
    }">Undo</button>    
    </div>
    <div class="con4_game_loading_msg">Loading</div>
</section>`,
    {
      board_id,
      undo_btn_id,
      heights,
      play_ctrl_elems_hidden_flags,
      play_ctrl_elems_ids,
      play_ctrl_score_elems_ids,
    },
  ];
}

export function make_con4_game_logic_callbacks(
  core,
  callback_fn,
  first_opt_fetch_fn
) {
  const {
    elem_mut_ref,
    base_actions_list,
    following_actions_list,
    api_url,
    w,
    h,
    utils: {
      board_id,
      undo_btn_id,
      heights,
      play_ctrl_elems_hidden_flags,
      play_ctrl_elems_ids,
      play_ctrl_score_elems_ids,
    },
  } = core;

  let imagine_action = undefined;
  let api_data = undefined;
  let undo_hidden_flag = true;

  const modify_ctrl_panel = () => {
    let end = false;
    if (api_data == undefined) {
      elem_mut_ref.classList.add(LOADING_CLASSNAME);
    } else {
      elem_mut_ref.classList.remove(LOADING_CLASSNAME);
      for (let i = 0; i < api_data.nexts.length; ++i) {
        const curr_action_data = api_data.nexts[i];
        document.getElementById(
          play_ctrl_score_elems_ids[curr_action_data.a]
        ).innerText = -curr_action_data.s;
      }
      if (api_data.nexts.length == 0) {
        end = true;
      }
    }

    for (let i = 0; i < w; ++i) {
      if (heights[i] < h && !end) {
        if (play_ctrl_elems_hidden_flags[i] == true) {
          document
            .getElementById(play_ctrl_elems_ids[i])
            .classList.remove(HIDDEN_CLASSNAME);
          play_ctrl_elems_hidden_flags[i] = false;
        }
      } else {
        if (
          play_ctrl_elems_hidden_flags[i] == false ||
          api_data.nexts.length == 0
        ) {
          document
            .getElementById(play_ctrl_elems_ids[i])
            .classList.add(HIDDEN_CLASSNAME);
          play_ctrl_elems_hidden_flags[i] = true;
        }
      }
    }
    if ((undo_hidden_flag != following_actions_list.length) == 0) {
      if (undo_hidden_flag == true) {
        document.getElementById(undo_btn_id).classList.remove(HIDDEN_CLASSNAME);
      } else {
        document.getElementById(undo_btn_id).classList.add(HIDDEN_CLASSNAME);
      }
      undo_hidden_flag = !undo_hidden_flag;
    }
  };

  const fetch_fn = () => {
    if (first_opt_fetch_fn != undefined) {
      const first_try_res = first_opt_fetch_fn(
        base_actions_list,
        following_actions_list
      );
      if (first_try_res != undefined) {
        api_data = first_try_res;
        modify_ctrl_panel();
        return;
      }
    }
    const res = window.mdtome.fetch_static_json_helper(
      `${api_url}/${con4.two_actions_lists_to_string(
        base_actions_list,
        following_actions_list
      )}`
    );
    if (res.data != undefined) {
      api_data = res.data;
      modify_ctrl_panel();
    } else {
      res.promise
        .then((data) => {
          api_data = data;
          modify_ctrl_panel();
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  const render_fn = () => {
    const actions_list = con4.collect_actions(
      base_actions_list,
      following_actions_list,
      imagine_action
    );
    con4_board.render_actions_list(board_id, { w, h, actions_list });
    if (callback_fn != undefined) {
      callback_fn(following_actions_list, imagine_action);
    }
    modify_ctrl_panel();
  };

  const fetch_and_render_fn = () => {
    api_data = undefined;
    render_fn();
    fetch_fn();
  };

  const play_fn = (i) => {
    following_actions_list.push(i);
    imagine_action = undefined;
    heights[i] += 1;
    fetch_and_render_fn();
  };

  const undo_fn = () => {
    const last_i = following_actions_list.pop();
    if (last_i != undefined) {
      heights[last_i] -= 1;
    }
    imagine_action = undefined;
    fetch_and_render_fn();
  };

  const imagine_fn = (i) => {
    imagine_action = i;
    render_fn();
  };

  return { fetch_fn, play_fn, undo_fn, imagine_fn };
}

export function add_listeners_to_con4_game_ctrl(
  root_elem_id,
  w_num,
  play_fn,
  undo_fn,
  imagine_fn
) {
  for (let i = 0; i < w_num; ++i) {
    const curr_btn_elem_mut_ref = document.getElementById(
      make_play_ctrl_btn_elem_id(root_elem_id, i)
    );
    curr_btn_elem_mut_ref.addEventListener("click", () => {
      play_fn(i);
    });
    curr_btn_elem_mut_ref.addEventListener("mouseenter", () => {
      imagine_fn(i);
    });
    curr_btn_elem_mut_ref.addEventListener("mouseleave", () => {
      imagine_fn(undefined);
    });
  }
  const undo_btn_id = make_undo_btn_id(root_elem_id);
  const undo_btn_mut_ref = document.getElementById(undo_btn_id);
  undo_btn_mut_ref.addEventListener("click", undo_fn);
  undo_btn_mut_ref.addEventListener("mouseenter", () => {
    imagine_fn(-1);
  });
  undo_btn_mut_ref.addEventListener("mouseleave", () => {
    imagine_fn(undefined);
  });
}

/**
 * This function renders a Connect Four Interactive Playground into the elem having the corresponding `elem_id`.
 * @param {string} elem_id
 * @param {{w: number, h: number, actions: string, api_url: string}} param
 */
export function render(elem_id, param, callback_fn) {
  const w = param.w;
  const h = param.h;
  const elem_mut_ref = document.getElementById(elem_id);
  if (elem_mut_ref == undefined) {
    return;
  }
  const api_url = param.api_url;

  const base_actions_string = param.actions;
  const base_actions_list = con4.actions_string_to_list(base_actions_string);
  const following_actions_list = [];

  elem_mut_ref.classList.add(LOADING_CLASSNAME);

  const [elem_inner_html, utils] = make_con4_game_inner_string(
    elem_id,
    w,
    h,
    base_actions_list,
    following_actions_list
  );

  elem_mut_ref.innerHTML = elem_inner_html;

  const core = {
    w,
    h,
    elem_mut_ref,
    api_url,
    base_actions_list,
    following_actions_list,
    utils,
  };

  const { play_fn, undo_fn, imagine_fn, fetch_fn } =
    make_con4_game_logic_callbacks(core, callback_fn);

  add_listeners_to_con4_game_ctrl(elem_id, w, play_fn, undo_fn, imagine_fn);

  fetch_fn();
}
