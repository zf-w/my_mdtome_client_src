export function actions_to_board(actions, w) {
    let board = []
    for (let i = 0; i < w; ++i) {
      board.push([])
    }
  
    for (let i = 0; i < actions.length; ++i) {
      const action= actions[i]
      board[action - 1].push(i)
    }
  
    return board
  }