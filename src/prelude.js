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
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const SIDEBAR_STORAGE_KEY = "sidebar";
const SIDEBAR_ON_CLASS = "sidebar-on";
const THEME_KEY = "theme";

const html_elem_mut_ref = document.getElementById("$root");
let curr_theme_i = 0;

const themes = ["theme-zf-navy", "theme-zf-honey"];

let stored_str = localStorage.getItem(THEME_KEY);

if (html_elem_mut_ref != undefined) {
  if (stored_str != undefined && Number.parseInt(stored_str) < themes.length) {
    let stored_idx = Number.parseInt(stored_str);
    html_elem_mut_ref.classList.toggle(themes[stored_idx]);
  } else {
    html_elem_mut_ref.classList.toggle(themes[curr_theme_i]);
  }

  const sidebar_storage = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (sidebar_storage == null) {
    if (window.innerWidth > 800) {
      html_elem_mut_ref.classList.toggle(SIDEBAR_ON_CLASS);
    }
  } else if (sidebar_storage == "on") {
    html_elem_mut_ref.classList.toggle(SIDEBAR_ON_CLASS);
  }
}

window.mdtome = { fetched_jsons: {} };

window.mdtome.fetch_static_json_helper = (url) => {
  let entry = window.mdtome.fetched_jsons[url];
  if (entry == undefined) {
    window.mdtome.fetched_jsons[url] = {};
    entry = window.mdtome.fetched_jsons[url];
  }
  if (entry.data != undefined) {
    console.log(`Fetch cached ${url}`);
    return { data: entry.data };
  } else {
    if (entry.wait == undefined) {
      entry.wait = [];

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          entry.data = data;
          for (let i = 0; i < entry.wait.length; ++i) {
            const promise_ref = entry.wait[i];
            console.log(`Resolving promise ${i} on ${url}`);
            promise_ref.resolve(data);
          }
        })
        .catch((err_msg) => {
          for (let i = 0; i < entry.wait.length; ++i) {
            const promise_ref = entry.wait[i];
            promise_ref.reject(err_msg);
          }
        });
    }
    return {
      promise: new Promise((resolve, reject) => {
        entry.wait.push({ resolve, reject });
      }),
    };
  }
};
