import * as con4 from "con4"
import * as con4_board from "con4_board"

const HIDDEN_CLASSNAME = "hidden"
const LOADING_CLASSNAME = "con4_game_loading"

function make_play_ctrl_btn_elem_id(root_elem_id, i) {
    return `${root_elem_id}_play_${i}`
}

function make_play_ctrl_elem_id(root_elem_id, i) {
    return `${root_elem_id}_play_ctrl_${i}`
}

function make_play_ctrl_score_elem_id(root_elem_id, i) {
    return `${root_elem_id}_play_score${i}`
}

function make_undo_btn_id(root_elem_id) {
    return `${root_elem_id}_undo_btn`
}

function add_listeners_to_con4_game_ctrl(root_elem_id, w_num, play_fn, undo_fn, imagine_fn, restart_fn) {
    for (let i = 0; i < w_num; ++i) {
        const curr_btn_elem_mut_ref = document.getElementById(make_play_ctrl_btn_elem_id(root_elem_id, i))
        curr_btn_elem_mut_ref.addEventListener("click", () => {play_fn(i)})
        curr_btn_elem_mut_ref.addEventListener("mouseenter", () => {imagine_fn(i)})
        curr_btn_elem_mut_ref.addEventListener("mouseleave", () => {imagine_fn(undefined)})
    }
    const undo_btn_id = make_undo_btn_id(root_elem_id)
    const undo_btn_mut_ref = document.getElementById(undo_btn_id)
    undo_btn_mut_ref.addEventListener("click", undo_fn)
    undo_btn_mut_ref.addEventListener("mouseenter", () => {imagine_fn(-1)})
    undo_btn_mut_ref.addEventListener("mouseleave", () => {imagine_fn(undefined)})
}
/**
 * This function renders a Connect Four Interactive Playground into the elem having the corresponding `elem_id`.
 * @param {string} elem_id 
 * @param {{w: number, h: number, actions: string, api_url: string}} data 
 */
export function render(elem_id, data) {
    const w = data.w
    const h = data.h
    const elem_mut_ref = document.getElementById(elem_id)
    if (elem_mut_ref == undefined) {
        return
    }
    const api_url = data.api_url

    const base_actions_string = data.actions
    const base_actions_list = con4.actions_string_to_list(base_actions_string)
    const following_actions_list = []
    let imagine_action = undefined
    let loading = true
    let api_data = undefined

    elem_mut_ref.classList.add(LOADING_CLASSNAME)

    let actions_list = con4.collect_actions(base_actions_list, following_actions_list, imagine_action)
    const heights = new Uint8Array(w)
    const play_ctrl_elems_hidden_flags = []
    const play_ctrl_elems_ids = []
    let undo_hidden_flag = true;

    for (let i = 0; i < actions_list.length; ++i) {
        heights[actions_list[i]] += 1
    }
    for (let i = 0; i < w; ++i) {
        if (heights[i] < h) {
            play_ctrl_elems_hidden_flags.push(false)
        } else {
            play_ctrl_elems_hidden_flags.push(true)
        }
        play_ctrl_elems_ids.push(make_play_ctrl_elem_id(elem_id, i))
    }

    const board_id = `${elem_id}_board`
    const undo_btn_id = make_undo_btn_id(elem_id)

    const col_off_num = 100 / w
    const play_ctrl_btns_strings = []
    for (let i = 0; i < w; ++i) {
            const hidden_class = heights[i] < h? "": HIDDEN_CLASSNAME
            play_ctrl_btns_strings.push(`<div id=${play_ctrl_elems_ids[i]} class="con4_game_play_ctrl ${hidden_class}" style="width:${col_off_num}%;"><button id="${make_play_ctrl_btn_elem_id(elem_id, i)}" class="con4_game_btn" >play</button><div id=${make_play_ctrl_score_elem_id(elem_id, i)}>0</div></div>`)//left:${i * col_off_num}%
        
    }

    elem_mut_ref.innerHTML = 
    `${con4_board.make_board_with_wrapper_elem_string(actions_list, w, h, board_id)}
<section class="con4_game_ctrl_root">
    <div class="con4_game_play_row">
    ${"".concat(...play_ctrl_btns_strings)}
    </div>
    <div class="con4_game_ctrl_1_row">
        <button id=${undo_btn_id} class="con4_game_btn hidden">Undo</button>
    </div>
</section>`

    const modify_ctrl_panel = () => {
        if (loading == true) {
            elem_mut_ref.classList.add(LOADING_CLASSNAME)
        } else {
            elem_mut_ref.classList.remove(LOADING_CLASSNAME)
        }
        for (let i = 0; i < w; ++i) {
            if (heights[i] < h) {
                if (play_ctrl_elems_hidden_flags[i] == true) {
                    document.getElementById(play_ctrl_elems_ids[i]).classList.remove(HIDDEN_CLASSNAME)
                    play_ctrl_elems_hidden_flags[i] = false
                }
            } else {
                if (play_ctrl_elems_hidden_flags[i] == false) {
                    document.getElementById(play_ctrl_elems_ids[i]).classList.add(HIDDEN_CLASSNAME)
                    play_ctrl_elems_hidden_flags[i] = true
                }   
            }
        }
        if (undo_hidden_flag != following_actions_list.length == 0) {
            if (undo_hidden_flag == true) {
                document.getElementById(undo_btn_id).classList.remove(HIDDEN_CLASSNAME)
            } else {
                document.getElementById(undo_btn_id).classList.add(HIDDEN_CLASSNAME)
            }
            undo_hidden_flag = !undo_hidden_flag
        }
    }

    const fetch_fn = () => {
        fetch(`${api_url}/${con4.two_actions_lists_to_string(base_actions_list, following_actions_list)}`).then((res) => {
            return res.json()
        }).then((data) => {
            console.log(data)
            loading = true
            modify_ctrl_panel()
        }).catch((err) => {
            console.log(err)
        }) 

    }

    const render_fn = () => {
        actions_list = con4.collect_actions(base_actions_list, following_actions_list, imagine_action)
        con4_board.render_actions_list(board_id, {w, h, actions_list})
        loading = true
        modify_ctrl_panel()
        fetch_fn()
    }

    const play_fn = (i) => {
        following_actions_list.push(i)
        imagine_action = undefined
        heights[i] += 1
        render_fn()
    } 

    const undo_fn = () => {
        const last_i = following_actions_list.pop()
        if (last_i != undefined) {
            heights[last_i] -= 1
        }
        render_fn()
    }

    const imagine_fn = (i) => {
        imagine_action = i
        render_fn()
    }

    add_listeners_to_con4_game_ctrl(elem_id, w, play_fn, undo_fn, imagine_fn)

    fetch_fn()
}