import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'
import * as redux from 'react-redux'
import {Mech} from './game'


// ---- types
type Phase = 'move' | 'attack';
type Speed = 'walk' | 'run';
type Facing = 0 | 1 | 2 | 3 | 4 | 5;

const initialState = {
  phase: 'move' as Phase,

  mechs: [] as Mech[],

  // movement
  move: {
    speed: 'walk' as Speed,
    selected_mech: -1,
    staged: [] as number[],
  }
}


const gameSlice = createSlice({
  name: 'game',
  initialState: initialState,
  reducers: {
    initialize: (state, action: PayloadAction<[Mech[]]>) => {
      state.mechs = action.payload[0];
      state.mechs.forEach((m,n) => m.id = n);
    },
    move_select: ({move}, action: PayloadAction<number>) => {
      move.selected_mech = action.payload;
      move.staged = [];
    },
    move_speed: ({move}, action: PayloadAction<Speed>) => {
      if (move.speed !== action.payload) {
        move.speed = action.payload;
        move.staged = [];
      }
    },
    move_stage: ({move}, action: PayloadAction<number[]>) => {
      if (move.selected_mech >= 0) {
        move.staged = action.payload;
      }
    },

    move_commit: (game) => {
      if (game.move.staged.length > 1) {
        const mech = game.mechs[game.move.selected_mech];
        const staged = game.move.staged;

        mech.hex = staged[staged.length-2];
        mech.facing = staged[staged.length-1] as Facing;
        game.move.selected_mech = -1;
        game.move.staged = [];
      }
    },
  }
});


export const ACTION = gameSlice.actions;



// ---- store
export const store = configureStore({
  reducer: {
    game: gameSlice.reducer
  }
});


type MyDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export const useSelector: redux.TypedUseSelectorHook<RootState> = redux.useSelector
export const useDispatch: () => MyDispatch = redux.useDispatch;

