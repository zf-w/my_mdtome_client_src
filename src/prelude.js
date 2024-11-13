/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-only
 *```license
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
 * ```
 */

function pre_content_load_procedure() {
  const PAGE_ROOT_ELEM_ID = "$root";

  const LOCAL_STORAGE_SIDEBAR_KEY = "sidebar";
  const LOCAL_STORAGE_THEME_KEY = "theme";

  const SIDEBAR_ON_CLASS = "sidebar_on";

  const THEME_STRINGS_LIST = ["theme_zf_navy", "theme_zf_honey"];

  const html_elem_mut_ref = document.getElementById(PAGE_ROOT_ELEM_ID);

  let curr_theme_string = THEME_STRINGS_LIST[0];

  const stored_theme_string = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
  if (
    stored_theme_string != undefined &&
    THEME_STRINGS_LIST.find((v) => {
      return v == stored_theme_string;
    }) != undefined
  ) {
    curr_theme_string = stored_theme_string;
  }

  const sidebar_storage = localStorage.getItem(LOCAL_STORAGE_SIDEBAR_KEY);
  if (html_elem_mut_ref != undefined) {
    html_elem_mut_ref.classList.toggle(curr_theme_string);

    if (sidebar_storage == null) {
      if (window.innerWidth > 800) {
        html_elem_mut_ref.classList.toggle(SIDEBAR_ON_CLASS);
      }
    } else if (sidebar_storage == "on") {
      html_elem_mut_ref.classList.toggle(SIDEBAR_ON_CLASS);
    }
  }

  window.mdtome = { fetched_jsons: {}, curr_theme_string };

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
              console.log(
                `Resolving identical promise ${i} on ${url} with data`,
                data
              );
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
}

function post_content_load_procedure() {
  const LISTENER_CLICK_EVT_STRING = "click";

  const LOCAL_STORAGE_SIDEBAR_KEY = "sidebar";
  const LOCAL_STORAGE_THEME_KEY = "theme";

  const PAGE_LANG_ZH_STRING = "zh";
  const PAGE_END_TIMESTAMP_ELEM_ID = "$end_timestamp";
  const PAGE_MENU_ICON_ELEM_ID = "$menu_icon";
  const PAGE_ROOT_ELEM_ID = "$root";

  const THEME_STRINGS_LIST = ["theme_zf_navy", "theme_zf_honey"];

  const SIDEBAR_ON_CLASS = "sidebar_on";

  const html_elem_mut_ref = document.getElementById(PAGE_ROOT_ELEM_ID);

  const menu_icon_elem = document.getElementById(PAGE_MENU_ICON_ELEM_ID);

  menu_icon_elem.addEventListener(LISTENER_CLICK_EVT_STRING, () => {
    if (html_elem_mut_ref) {
      if (html_elem_mut_ref.classList.contains(SIDEBAR_ON_CLASS)) {
        localStorage.setItem(LOCAL_STORAGE_SIDEBAR_KEY, "off");
      } else {
        localStorage.setItem(LOCAL_STORAGE_SIDEBAR_KEY, "on");
      }
      html_elem_mut_ref.classList.toggle(SIDEBAR_ON_CLASS);
    }
  });

  function switch_theme(to_theme_string) {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, to_theme_string);
    html_elem_mut_ref.classList.replace(
      window.mdtome.curr_theme_string,
      to_theme_string
    );
    window.mdtome.curr_theme_string = to_theme_string;
  }

  THEME_STRINGS_LIST.forEach((theme_class_string) => {
    const curr_theme_btn = document.getElementById(
      `$${theme_class_string}_btn`
    );
    if (curr_theme_btn != undefined) {
      curr_theme_btn.addEventListener(LISTENER_CLICK_EVT_STRING, () => {
        switch_theme(theme_class_string);
      });
    }
  });

  const end_timestamp_elem_mut_ref = document.getElementById(
    PAGE_END_TIMESTAMP_ELEM_ID
  );
  if (end_timestamp_elem_mut_ref != undefined) {
    let update_msg_string = "Last Update";
    if (
      html_elem_mut_ref != undefined &&
      html_elem_mut_ref.lang == PAGE_LANG_ZH_STRING
    ) {
      update_msg_string = "最后更新";
    }
    const date_string = new Date(
      Number.parseInt(end_timestamp_elem_mut_ref.innerText)
    ).toString();
    end_timestamp_elem_mut_ref.innerText = `${update_msg_string}: ${date_string}`;
  }
}

pre_content_load_procedure();
