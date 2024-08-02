import * as con4 from "con4"

function make_p0_string(x, y, char_i) {
    return `<svg
    stroke="var(--fg)"
    fill="var(--fg)"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    x=${x}
    y=${y}
    width=1
>
    <circle cx="12" cy="12" r="10" strokeWidth="1"></circle>
    <text x="12" y="13" class="con4_board_p con4_board_p0">
    ${char_i}
    </text>
</svg>`
}

function make_p1_string(x, y, char_i) {
    return `<svg
    stroke="var(--fg)"
    fill="None"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width=1
    x=${x}
    y=${y}
>
    <circle cx="12" cy="12" r="10" strokeWidth="1"></circle>
    <text x="12" y="13" class="con4_board_p con4_board_p1">
    ${char_i}
    </text>
</svg>`
}

export function make_board_elem_string(actions_list, w_num, h_num) {
    let heights = new Int8Array(w_num);
    const h_off = h_num / 2 - 0.5;
    let piece_strings = [];
    for (let i = 0; i < actions_list.length; ++i) {
        const curr_col_i = actions_list[i];
        const curr_row_i = heights[curr_col_i];
        heights[curr_col_i] += 1;
        const curr_h =  h_off - curr_row_i;
        if (i % 2 == 0) {
            piece_strings.push(make_p0_string(curr_col_i, curr_h, i));
        } else {
            piece_strings.push(make_p1_string(curr_col_i, curr_h, i));
        }
    }

    return `<div class="con4_board_inner"><svg
    class="con4_board_svg"
    stroke="currentColor"
    fill="currentColor"
    viewBox="0 0 ${7} ${6}"
    xmlns="http://www.w3.org/2000/svg"
>${"".concat(...piece_strings)}
</svg></div>`;
}

export function make_board_with_wrapper_elem_string(actions_string, w_num, h_num, wrapper_elem_id_string) {
    return `<div id="${wrapper_elem_id_string}">${make_board_elem_string(actions_string, w_num, h_num)}</div>`
}

export function render_actions_list(elem_id, data) {
    const actions_list = data.actions_list;
    const w = data.w;
    const h = data.h;

    const elem = document.getElementById(elem_id);

    elem.innerHTML = make_board_elem_string(actions_list, w, h);
}

export function render(elem_id, data) {
    const actions_string = data.actions;
    const w = data.w;
    const h = data.h;

    const elem = document.getElementById(elem_id);

    elem.innerHTML = make_board_elem_string(con4.actions_string_to_list(actions_string), w, h);
    
}