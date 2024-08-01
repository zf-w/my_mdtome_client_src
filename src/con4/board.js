

export function render(elem_id, data) {
    console.log(data)
    const actions = data.actions;
    const w = data.w;
    const h = data.h;

    const elem = document.getElementById(elem_id);
    let heights = new Int8Array(w);
    const h_off = h / 2 - 0.5;
    let piece_strings = [];
    for (let char_i = 0; char_i < actions.length; ++char_i) {
        const curr_action = Number.parseInt(actions[char_i]);
        const curr_col_i = curr_action - 1;
        const curr_row_i = heights[curr_col_i];
        heights[curr_col_i] += 1;
        const curr_h =  h_off - curr_row_i;
        if (char_i % 2) {
            piece_strings.push(
`<svg
    stroke="var(--fg)"
    fill="var(--fg)"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    x=${curr_col_i}
    y=${curr_h}
    width=1
>
    <circle cx="12" cy="12" r="10" strokeWidth="1"></circle>
    <text x="12" y="13" class="con4_board_p0">
    ${char_i}
    </text>
</svg>`);
        } else {
            piece_strings.push(
`<svg
    stroke="var(--fg)"
    fill="None"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width=1
    x=${curr_col_i}
    y=${curr_h}
>
    <circle cx="12" cy="12" r="10" strokeWidth="1"></circle>
    <text x="12" y="13" class="con4_board_p1">
    ${char_i}
    </text>
</svg>`);
        }
    }

    elem.innerHTML = `<div class="con4_board_inner"><svg
    class="con4_board_svg"
    stroke="currentColor"
    fill="currentColor"
    viewBox="0 0 ${7} ${6}"
    xmlns="http://www.w3.org/2000/svg"
>${"".concat(piece_strings)}
</svg></div>`;
    
}