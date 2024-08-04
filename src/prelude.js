const SIDEBAR_STORAGE_KEY = "sidebar";
const SIDEBAR_ON_CLASS = "sidebar-on";
const THEME_KEY = "theme";

const html_elem_mut_ref = document.getElementById("$root");
let curr_theme_i = 0;

const themes = ["theme-rust-navy", "theme-zf-honey"];


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

window.mdbook = {fetched_jsons: {}};

window.mdbook.fetch_static_json_helper = (url) => {
  let entry = window.mdbook.fetched_jsons[url]
  if (entry == undefined) {
    window.mdbook.fetched_jsons[url] = {}
    entry = window.mdbook.fetched_jsons[url]
  }
  if (entry.data != undefined) {
    console.log(`Fetch cached ${url}`)
    return {"data": entry.data}
  } else {
    
    if (entry.wait == undefined) {
      entry.wait = []
      
      fetch(url).then((res) => res.json()).then((data) => {
        entry.data = data
        for (let i = 0; i < entry.wait.length; ++i) {
          const promise_ref = entry.wait[i]
          console.log(`Resolving promise ${i} on ${url}`)
          promise_ref.resolve(data)
        }
      }).catch((err_msg) => {
        for (let i = 0; i < entry.wait.length; ++i) {
          const promise_ref = entry.wait[i]
          promise_ref.reject(err_msg)
        }
      })
    }
    return {promise: new Promise((resolve, reject) => {
      entry.wait.push({resolve, reject})
    })}
  }
}

