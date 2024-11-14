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

function make_hex_string(bytes) {
  const byte_arr = Array.from(bytes);
  const ans_hex_string = byte_arr
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return ans_hex_string;
}

async function make_sha_2_384_hash_string_from_msg(msg_string) {
  const SHA_384_NAME = "SHA-384";
  const msg_u8_arr = new TextEncoder().encode(msg_string); // encode as (utf-8) Uint8Array
  const plain_hashed_arr_buf = await window.crypto.subtle.digest(
    SHA_384_NAME,
    msg_u8_arr
  );
  const ans_hex_string = make_hex_string(new Uint8Array(plain_hashed_arr_buf)); // convert buffer to byte array

  return ans_hex_string;
}

const HTML_TAG_CLASS_KEY_STRING = "class";

const EXT_MSG_IN_HTML_ELEM_TAG = "textarea";
const EXT_MSG_IN_CLASS = "util_security_strhash_inner_msg_in";
const EXT_HASH_OUT_HTML_ELEM_TAG = "div";
const EXT_HASH_OUT_CLASS = "util_security_strhash_inner_hash_out";

/**
 * @param {string} elem_id
 */
export function render_util_security_strhash(elem_id) {
  const elem_mut_ref = document.getElementById(elem_id);
  const textbox_elem_mut_ref = document.createElement(EXT_MSG_IN_HTML_ELEM_TAG);
  textbox_elem_mut_ref.setAttribute(
    HTML_TAG_CLASS_KEY_STRING,
    EXT_MSG_IN_CLASS
  );

  const text_hash_output_div_elem_mut_ref = document.createElement(
    EXT_HASH_OUT_HTML_ELEM_TAG
  );
  text_hash_output_div_elem_mut_ref.setAttribute(
    HTML_TAG_CLASS_KEY_STRING,
    EXT_HASH_OUT_CLASS
  );

  textbox_elem_mut_ref.setAttribute(
    "placeholder",
    'Enter message here and get a hash "fingerprint"...'
  );
  textbox_elem_mut_ref.setAttribute(
    "name",
    `${elem_id}_inner_msg_input_textarea`
  );
  textbox_elem_mut_ref.setAttribute("autocomplete", "off");
  textbox_elem_mut_ref.setAttribute("autocorrect", "off");
  textbox_elem_mut_ref.setAttribute("spellcheck", "false");
  const update = () => {
    if (textbox_elem_mut_ref.scrollHeight > textbox_elem_mut_ref.clientHeight) {
      textbox_elem_mut_ref.style.height = `${textbox_elem_mut_ref.scrollHeight}px`;
    }
    make_sha_2_384_hash_string_from_msg(textbox_elem_mut_ref.value).then(
      (ans_hashed_string) => {
        text_hash_output_div_elem_mut_ref.textContent = ans_hashed_string;
      }
    );
  };

  update();

  textbox_elem_mut_ref.addEventListener("keyup", (event) => {
    event.preventDefault();
    update();
  });

  elem_mut_ref.appendChild(text_hash_output_div_elem_mut_ref);
  elem_mut_ref.appendChild(textbox_elem_mut_ref);
}
