const HTML_ELEM = document.getElementById("$root");
let curr = 0;
const THEME_KEY = "theme";
const themes = ["theme-rust-navy", "theme-zf-honey"];

let stored_str = localStorage.getItem(THEME_KEY);

if (stored_str != undefined && Number.parseInt(stored_str) < themes.length) {
  let stored_idx = Number.parseInt(stored_str);

  HTML_ELEM?.classList.toggle(themes[stored_idx]);
} else {
  HTML_ELEM?.classList.toggle(themes[curr]);
}

const SIDEBAR_STORAGE_KEY = "sidebar";
const SIDEBAR_ON_CLASS = "sidebar-on";
const sidebar_storage = localStorage.getItem(SIDEBAR_STORAGE_KEY);
if (sidebar_storage == null) {
  if (window.innerWidth > 800) {
    HTML_ELEM?.classList.toggle(SIDEBAR_ON_CLASS);
  }
} else if (sidebar_storage == "on") {
  HTML_ELEM?.classList.toggle(SIDEBAR_ON_CLASS);
}

window.data = {};
window.mdbook = {};