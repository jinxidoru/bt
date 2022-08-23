import {window_any,Point,point,Images} from './btutil'
import {Board} from './board'
import {HEX_H,HEX_W} from './const'
import {createDirty} from './react-utils'

const HEX_W4 = HEX_W / 4;
const HEX_H2 = HEX_H / 2;
const SQRT_3 = Math.sqrt(3);


// --- types
export type Facing = 0 | 1 | 2 | 3 | 4 | 5;
export type Mech = ReturnType<typeof new_mech>
type Phase = 'move' | 'attack';
type Speed = 'walk' | 'run';



export interface PathStep {
  hex: number;
  mps: number;
  facing: Facing;
  prev?: PathStep;
}

interface MoveOverlay {
  mech: Mech;
  mode: 0|1|2|3
  hexes: PathStep[][];
}

interface Path {
  mode: 0|1|2|3
  end: PathStep
}

function facing_rotate(f:Facing, dir:number) {
  return ((f+dir+6) % 6) as Facing;
}




export class MapView {

  // draw settings
  redraw = true;
  debug:any = {};

  // transform
  scale = 1.5
  ox = 0        // top-left corner X
  oy = 0        // top-left corner Y

  // ui state
  drag_prev: Point|null = null;
  moveOverlay: MoveOverlay|null = null;

  // debug
  paused = false;
  fps = false;
  fps_tms : number[] = [];
  show_hex_number = true;

  // movement
  path: Path|null = null;

  board = Board.empty();


  // --- methods
  hex_corner(x:number, y:number) {
    return point(
      x * (HEX_W/4) * 3,
      (y * 2 + (x%2)) * (HEX_H/2));
  }

  center_idx(idx:number) {
    const {x,y} = this.board.from_index(idx);
    return point(
      x * (HEX_W/4) * 3 + (HEX_W/2),
      (y * 2 + (x%2) + 1) * (HEX_H/2));
  }

  hex_from_view_xy(vx:number, vy:number) {
    let x = Math.floor(vx*4 / 3 / HEX_W)
    let y = Math.floor((((vy*2)/HEX_H) - (x%2))/2);

    let op = this.hex_corner(x,y);
    let ox = vx - op.x;
    let oy = vy - op.y;

    // check the edges
    if (ox < HEX_W4) {

      // top-left
      if (oy < HEX_H2) {
        oy = (HEX_H2-oy);
        if (ox <= 0 || (oy/ox) > SQRT_3) {
          x--;
          y -= (x%2);
        }

      // bottom-left
      } else {
        oy -= HEX_H2;
        if (ox <= 0 || (oy/ox) > SQRT_3) {
          y += (x%2);
          x--;
        }
      }
    }

    return this.board.index_of(x,y);
  }

  facing_from_view_xy(hex:number, vx:number, vy:number) : Facing {
    let cp = this.center_idx(hex);
    const ox = vx - cp.x;
    const oy = vy - cp.y;
    const r = Math.sqrt((ox*ox) + (oy*oy));
    if (r === 0)  return 0;

    const acos = (ox/r);
    if (acos > 0.5)  return (oy>0) ? 2 : 1;
    if (acos > -0.5)  return (oy>0) ? 3 : 0;
    return (oy>0) ? 4 : 5;
  }
};


export function new_mech(hex:number, img_url:string, team:number) {
  const mech = {
    id: -1,
    name: img_url,
    imgkey: Images.load_mech(img_url,team),
    facing: 1 as Facing,
    mps_walk: 6,
    mps_run: 9,
    hex, team,
  }

  return mech;
}


export class GameState {
  view = new MapView();
  board = Board.empty();
  dirty = createDirty();
  mechs:Mech[] = [];

  constructor() {
    window_any.game = this;
    Images.set_game(this);
  }

  set_board(board:Board) {
    this.board = board;
    this.view.board = board;
    this.view.redraw = true;
  }


  // movement
  move = {
    speed: 'walk' as Speed,
    selected_mech: -1,
    staged: [] as number[]
  }


  // ---- actions
  private move_action() {
    this.dirty.mark();
    return this.move;
  }

  set_mechs(mechs:Mech[]) {
    this.dirty.mark();
    this.mechs = mechs;
    this.mechs.forEach((m,n) => m.id = n);
  }

  move_select(sel:number) {
    const move = this.move_action();
    move.selected_mech = sel;
    move.staged = [];
  }

  move_speed(speed:Speed) {
    const move = this.move_action();
    if (move.speed !== speed) {
      move.speed = speed;
      move.staged = [];
    }
  }

  move_stage(path:number[]) {
    const move = this.move_action();
    if (move.selected_mech >= 0) {
      move.staged = path;
    }
  }

  move_commit() {
    const move = this.move_action();
    if (move.staged.length > 1) {
      const mech = this.mechs[move.selected_mech];
      const staged = move.staged;

      mech.hex = staged[staged.length-2];
      mech.facing = staged[staged.length-1] as Facing;
      move.selected_mech = -1;
      move.staged = [];
    }
  }


  // ---- pathing
  path_update(dst:number, facing:Facing, moveOverlay:MoveOverlay) {
    const view = this.view;

    // check for ignorable
    if (view.path && view.path.end.hex === dst && view.path.end.facing === facing) {
      return;
    }

    // init
    view.redraw = true;
    view.path = null;

    // create the closest facing
    const odst = moveOverlay.hexes[dst];
    if (odst) for (let df of [0,1,-1,2,-2,3]) {
      var xface = facing_rotate(facing,df);
      if (odst[xface]) {
        view.path = {mode:moveOverlay.mode, end:odst[xface]};
        return;
      }
    }
  }


  // --- overlay
  move_overlay_for_mech(mech:Mech, speed:Speed) : MoveOverlay {
    const mode = (speed === 'walk') ? 0 : (speed === 'run') ? 1 : 2;
    const olay:MoveOverlay = { mech, mode, hexes:[] };
    const mps = (mode === 0) ? mech.mps_walk : mech.mps_run;
    const hexes = olay.hexes;
    const board = this.board;

    // create the start location
    visit(mps, mech.hex, mech.facing);

    function visit(mps:number, hex:number, facing:Facing, prev?:PathStep) {
      const olay_hex = hexes[hex] || (hexes[hex] = []);
      if (!olay_hex[facing] || (mps > olay_hex[facing].mps)) {
        const cur = olay_hex[facing] = {mps,hex,facing,prev};

        // rotation first
        if (mps >= 1) {
          visit(mps-1, hex, facing_rotate(facing,-1), cur);
          visit(mps-1, hex, facing_rotate(facing,+1), cur);
          if (mps >= 2) {
            visit(mps-2, hex, facing_rotate(facing,-2), cur);
            visit(mps-2, hex, facing_rotate(facing,+2), cur);
            if (mps >= 3) {
              visit(mps-3, hex, facing_rotate(facing,3), cur);
            }
          }
        }

        // movement: forward
        if (mps > 0) {
          const next_hex = board.hex_by_facing(hex,facing);
          if (next_hex !== -1) {
            const xmps = mps - board.move_cost(hex,next_hex);
            if (xmps >= 0) {
              visit(xmps, next_hex, facing, cur);
            }
          }
        }

        // movement: reverse
        if (mps > 0 && mode === 0) {
          const next_hex = board.hex_by_facing(hex,facing_rotate(facing,3));
          if (next_hex !== -1) {
            const xmps = mps - board.move_cost(hex,next_hex);
            if (xmps >= 0) {
              visit(xmps, next_hex, facing, cur);
            }
          }
        }
      }
    }

    return olay;
  }


  is_obstructed(hex:number, team:number = -1) {

    // check for a mech
    for (let mech of this.mechs) {
      if ((mech.team !== team) && (mech.hex === hex)) {
        return true;
      }
    }

    return false;
  }

};


