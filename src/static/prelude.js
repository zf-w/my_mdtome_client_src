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
{
  const THEME_STRINGS_LIST = ["theme_light", "theme_navy", "theme_honey"];

  const PAGE_ROOT_ELEM_ID = "$root";

  const LOCAL_STORAGE_SIDEBAR_KEY = "sidebar";
  const LOCAL_STORAGE_THEME_KEY = "theme";

  const SIDEBAR_ON_CLASS = "sidebar_on";
  const SIDEBAR_MENU_ON_CLASS = "sidebar_menu_on";
  const SIDEBAR_THEME_ON_CLASS = "sidebar_theme_on";

  const BIONIC_STORAGE_KEY = "bionic_on";
  const BIONIC_CLASS = "bionic_on";
  const LEFTNAV_BIONIC_BTN_ID = "$leftnav_bionic_btn";

  const html_elem_mut_ref = document.getElementById(PAGE_ROOT_ELEM_ID); // Should work.
  const html_elem_class_list_mut_ref = html_elem_mut_ref.classList;

  console.log(html_elem_mut_ref, "This should be valid...");

  function set_leftnav_state(state_num) {
    let prev_state_num = window.mdtome.sidebar_state_num;
    let ok_flag = false;
    if (prev_state_num == 0) {
      if (state_num == 1) {
        html_elem_class_list_mut_ref.add(
          SIDEBAR_ON_CLASS,
          SIDEBAR_MENU_ON_CLASS
        );
        ok_flag = true;
      } else if (state_num == 2) {
        html_elem_class_list_mut_ref.add(
          SIDEBAR_ON_CLASS,
          SIDEBAR_THEME_ON_CLASS
        );
        ok_flag = true;
      }
    } else if (prev_state_num == 1) {
      if (state_num == 0) {
        html_elem_class_list_mut_ref.remove(
          SIDEBAR_ON_CLASS,
          SIDEBAR_MENU_ON_CLASS
        );
        ok_flag = true;
      } else if (state_num == 2) {
        html_elem_class_list_mut_ref.replace(
          SIDEBAR_MENU_ON_CLASS,
          SIDEBAR_THEME_ON_CLASS
        );
        ok_flag = true;
      }
    } else if (prev_state_num == 2) {
      if (state_num == 0) {
        html_elem_class_list_mut_ref.remove(
          SIDEBAR_ON_CLASS,
          SIDEBAR_THEME_ON_CLASS
        );
        ok_flag = true;
      } else if (state_num == 1) {
        html_elem_class_list_mut_ref.replace(
          SIDEBAR_THEME_ON_CLASS,
          SIDEBAR_MENU_ON_CLASS
        );
        ok_flag = true;
      }
    }
    if (ok_flag) {
      window.mdtome.sidebar_state_num = state_num;
      localStorage.setItem(LOCAL_STORAGE_SIDEBAR_KEY, state_num);
    }
  }

  function toggle_bionic() {
    if (window.mdtome[BIONIC_CLASS] == 1) {
      window.mdtome[BIONIC_CLASS] = 0;
      localStorage.setItem(BIONIC_STORAGE_KEY, 0);
      html_elem_class_list_mut_ref.remove(BIONIC_CLASS);
    } else {
      window.mdtome[BIONIC_CLASS] = 1;
      localStorage.setItem(BIONIC_STORAGE_KEY, 1);
      html_elem_class_list_mut_ref.add(BIONIC_CLASS);
    }
  }

  function pre_content_load_procedure() {
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

    const sidebar_state_storage = localStorage.getItem(
      LOCAL_STORAGE_SIDEBAR_KEY
    );
    let sidebar_state_num = 0;
    if (sidebar_state_storage == "1") {
      sidebar_state_num = 1;
    } else if (sidebar_state_storage == "2") {
      sidebar_state_num = 2;
    }

    html_elem_class_list_mut_ref.toggle(curr_theme_string);

    if (sidebar_state_storage == undefined) {
      if (window.innerWidth > 800) {
        sidebar_state_num = 1;
      }
    }

    window.mdtome = {
      fetched_jsons: {},
      curr_theme_string,
      sidebar_state_num: 0,
    };

    set_leftnav_state(sidebar_state_num);

    const bionic_storage = localStorage.getItem(BIONIC_STORAGE_KEY);
    if (bionic_storage == "1") {
      window.mdtome[BIONIC_STORAGE_KEY] = 0;
    } else {
      window.mdtome[BIONIC_STORAGE_KEY] = 1;
    }

    toggle_bionic();

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

    const BTNBAR_MENU_ON_PART_ID = "$menu_icon_on_part";
    const BTNBAR_MENU_OFF_PART_ID = "$menu_icon_off_part";
    const BTNBAR_THEME_ON_PART_ID = "$theme_icon_on_part";
    const BTNBAR_THEME_OFF_PART_ID = "$theme_icon_off_part";

    const PAGE_LANG_ZH_STRING = "zh";
    const PAGE_END_TIMESTAMP_ELEM_ID = "$end_timestamp";

    const html_elem_mut_ref = document.getElementById(PAGE_ROOT_ELEM_ID);

    function add_listener_console_logged(elem_id, fn) {
      const elem_opt = document.getElementById(elem_id);
      if (elem_opt) {
        elem_opt.addEventListener(LISTENER_CLICK_EVT_STRING, fn);
      } else {
        console.error(`Elem with id="${elem_id}" not found...`);
      }
    }

    add_listener_console_logged(BTNBAR_MENU_ON_PART_ID, () => {
      set_leftnav_state(1);
    });

    add_listener_console_logged(BTNBAR_MENU_OFF_PART_ID, () => {
      set_leftnav_state(0);
    });

    add_listener_console_logged(BTNBAR_THEME_ON_PART_ID, () => {
      set_leftnav_state(2);
    });

    add_listener_console_logged(BTNBAR_THEME_OFF_PART_ID, () => {
      set_leftnav_state(0);
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

    add_listener_console_logged(LEFTNAV_BIONIC_BTN_ID, toggle_bionic);

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
}
