export function actions_string_to_list(actions_string) {
  const actions_list = []
  for (let i = 0; i < actions_string.length; ++i) {
      actions_list.push(Number.parseInt(actions_string[i] - 1))
  }
  return actions_list
}

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

export function collect_actions(base_actions_list, following_actions_list, imagine_action) {
  const ans_actions_list = base_actions_list.concat(following_actions_list)
  if (imagine_action != undefined) {
    if (imagine_action < 0 && following_actions_list.length > 0) {
      ans_actions_list.pop()
    } else {
      ans_actions_list.push(imagine_action)
    }
  }
  return ans_actions_list
}

export function two_actions_lists_to_string(base_actions_list, following_actions_list) {
  let ans_string = ""
  for (let i = 0; i < base_actions_list.length; ++i) {
    ans_string = ans_string.concat((base_actions_list[i] + 1).toString())
  }
  
  for (let i = 0; i < following_actions_list.length; ++i) {
    ans_string = ans_string.concat((following_actions_list[i] + 1).toString())
  }
  return ans_string
}