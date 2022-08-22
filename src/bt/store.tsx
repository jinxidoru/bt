import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'
import * as redux from 'react-redux'


// ---- types
type Phase = 'move' | 'attack';
type Speed = 'walk' | 'run';


const gameSlice = createSlice({
  name: 'game',
  initialState: {
    phase: 'move' as Phase,

    // movement
    move: {
      speed: 'walk' as Speed,
      selected_mech: -1,
      staged: [] as number[],
    }
  },

  reducers: {
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

