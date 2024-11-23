# Con4 Bhtree Viz

This visualization uses the octree data structure to fairly quickly locate each game state node of my Connect Four graph.

## Diary

### Nov. 15th, 2024

I found and fixed a bug about not correctly calculating the game board from the state node index. With the grouping of "identical" game states, we need to be careful about calculating the board with the list of played actions.
