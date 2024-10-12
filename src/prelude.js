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

const ROOT_ELEM_ID = "$root";
const MENU_ICON_ELEM_ID = "$menu_icon";

const SIDEBAR_STORAGE_KEY = "sidebar";
const SIDEBAR_ON_CLASS = "sidebar_on";
const THEME_KEY = "theme";

const html_elem_mut_ref = document.getElementById(ROOT_ELEM_ID);

const THEME_STRINGS_LIST = ["theme_zf_navy", "theme_zf_honey"];
let curr_theme_string = THEME_STRINGS_LIST[0];

function switch_theme(to_theme_string) {
  localStorage.setItem(THEME_KEY, to_theme_string);
  html_elem_mut_ref.classList.replace(curr_theme_string, to_theme_string);
  curr_theme_string = to_theme_string;
}

if (html_elem_mut_ref != undefined) {
  let stored_theme_string = localStorage.getItem(THEME_KEY);
  if (
    stored_theme_string != undefined &&
    THEME_STRINGS_LIST.find((v) => {
      return v == stored_theme_string;
    }) != undefined
  ) {
    curr_theme_string = stored_theme_string;
  }
  html_elem_mut_ref.classList.toggle(stored_theme_string);
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

function post_content_load_procedure() {
  const LISTENER_CLICK_EVT_STRING = "click";
  const menu_icon_elem = document.getElementById(MENU_ICON_ELEM_ID);
  menu_icon_elem.addEventListener(LISTENER_CLICK_EVT_STRING, () => {
    if (html_elem_mut_ref) {
      if (html_elem_mut_ref.classList.contains(SIDEBAR_ON_CLASS)) {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, "off");
      } else {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, "on");
      }
      html_elem_mut_ref.classList.toggle(SIDEBAR_ON_CLASS);
    }
  });

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

  async function hash_sha_256_hash_string(message) {
    const msg_u8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
    const res = await window.crypto.subtle.digest("SHA-256", msg_u8);

    const hash_u8_arr = Array.from(new Uint8Array(res)); // convert buffer to byte array
    const hash_hex_string = hash_u8_arr
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""); // convert bytes to hex string
    console.log(hash_hex_string); // hash the message
    return hash_hex_string;
  }

  /**
   * @type {{username: string}} auth_state
   */
  let auth_state = undefined;
  let auth_curr_class = undefined;

  const AUTH_USERNAME_GUEST_STRING = "Guest";

  const nav_auth_elem = document.getElementById("$nav_auth");
  const nav_auth_logged_in = document.getElementById("$nav_auth_logged_in");
  const AUTH_STATE_GUEST_CLASS = "nav_auth_guest";
  const AUTH_STATE_LOGGED_IN_CLASS = "nav_auth_logged_in";

  function refresh_nav_auth() {
    if (auth_state != undefined) {
      if (auth_state.username == AUTH_USERNAME_GUEST_STRING) {
        if (auth_curr_class != undefined) {
          nav_auth_elem.classList.replace(
            auth_curr_class,
            AUTH_STATE_GUEST_CLASS
          );
        } else {
          nav_auth_elem.classList.add(AUTH_STATE_GUEST_CLASS);
        }
        auth_curr_class = AUTH_STATE_GUEST_CLASS;
      } else {
        if (auth_curr_class != undefined) {
          nav_auth_elem.classList.replace(
            auth_curr_class,
            AUTH_STATE_LOGGED_IN_CLASS
          );
        } else {
          nav_auth_elem.classList.add(AUTH_STATE_LOGGED_IN_CLASS);
        }
        nav_auth_logged_in.innerText = `Hello, ${auth_state.username}`;
        auth_curr_class = AUTH_STATE_LOGGED_IN_CLASS;
      }
    }
  }

  async function handle_login_submit(username, password) {
    const hashed_password = await hash_sha_256_hash_string(password);
    const body = JSON.stringify({
      username: username,
      password: hashed_password,
    });
    fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    })
      .then((res_ok) => {
        return res_ok.json();
      })
      .then((res_json) => {
        if (res_json != undefined) {
          auth_state = res_json;
          refresh_nav_auth();
        }
        console.log(res_json);
      })
      .catch((err_res) => {
        console.log(err_res);
      });
  }

  const nav_auth_username_input_elem = document.getElementById(
    "$nav_auth_username_input"
  );
  const nav_auth_password_input_elem = document.getElementById(
    "$nav_auth_password_input"
  );
  const nav_auth_submit_btn_elem = document.getElementById(
    "$nav_auth_submit_btn"
  );

  fetch("/api/auth/whoami")
    .then((ok_res) => {
      return ok_res.json();
    })
    .then((res_json) => {
      if (res_json != undefined) {
        console.log(res_json);
        auth_state = res_json;
      } else {
        auth_state = {
          username: AUTH_USERNAME_GUEST_STRING,
        };
      }
      refresh_nav_auth();
    })
    .catch((err_res) => {
      console.error(err_res);
      auth_state = {
        username: AUTH_USERNAME_GUEST_STRING,
      };
      refresh_nav_auth();
    });

  if (nav_auth_submit_btn_elem != undefined) {
    nav_auth_submit_btn_elem.addEventListener(
      LISTENER_CLICK_EVT_STRING,
      (evt) => {
        evt.preventDefault();
        handle_login_submit(
          nav_auth_username_input_elem.value,
          nav_auth_password_input_elem.value
        );
        nav_auth_password_input_elem.value = "";
        nav_auth_username_input_elem.value = "";
      }
    );
  }
}
