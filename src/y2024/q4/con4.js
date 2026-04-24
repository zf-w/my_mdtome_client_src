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

export function actions_string_to_list(actions_string) {
  const actions_list = [];
  for (let i = 0; i < actions_string.length; ++i) {
    actions_list.push(Number.parseInt(actions_string[i] - 1));
  }
  return actions_list;
}

export function collect_actions(
  base_actions_list,
  following_actions_list,
  imagine_action
) {
  const ans_actions_list = base_actions_list.concat(following_actions_list);
  if (imagine_action != undefined) {
    if (imagine_action < 0 && following_actions_list.length > 0) {
      ans_actions_list.pop();
    } else {
      ans_actions_list.push(imagine_action);
    }
  }
  return ans_actions_list;
}

export function two_actions_lists_to_string(
  base_actions_list,
  following_actions_list
) {
  let ans_string = "";
  for (let i = 0; i < base_actions_list.length; ++i) {
    ans_string = ans_string.concat((base_actions_list[i] + 1).toString());
  }

  for (let i = 0; i < following_actions_list.length; ++i) {
    ans_string = ans_string.concat((following_actions_list[i] + 1).toString());
  }
  return ans_string;
}

export class Con4Game {
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
