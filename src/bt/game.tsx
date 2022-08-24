import {window_any,Point,point,Images} from './btutil'
import {Board} from './board'
import {HEX_H,HEX_W} from './const'
import {createDirty} from './react-utils'
import {Mimir,Mech,Facing} from './mimir'

const HEX_W4 = HEX_W / 4;
const HEX_H2 = HEX_H / 2;
const SQRT_3 = Math.sqrt(3);


// --- types
type Phase = 'move' | 'attack';
type Speed = 'walk' | 'run';



// ---- passthroughs
export const {new_mech} = Mimir;
export type { Mech, Facing };



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
  path: Path|null = null;
  path_waypoint: Path|null = null;

  // debug
  paused = false;
  fps = false;
  fps_tms : number[] = [];
  show_hex_number = true;

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


export class GameState {
  view = new MapView();
  board = Board.empty();
  dirty = createDirty();
  mimir = new Mimir();

  constructor() {
    window_any.game = this;
    Images.set_game(this);
    this.mimir.on_action(() => this.dirty.mark());
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
    staged: null as Path|null,
  }


  // ---- actions
  private move_action() {
    this.dirty.mark();
    return this.move;
  }

  move_select(sel:number) {

    // check if the mech is eligible to be selected
    const mech = (sel>=0) && this.mimir.mechs.at(sel);
    if (mech && mech.moved) {
      return;
    }

    // perform the move
    const move = this.move_action();
    move.selected_mech = mech ? mech.id : -1;
    this.move.staged = null;
    this.update_move_overlay();
  }

  move_speed(speed:Speed) {
    const move = this.move_action();
    const view = this.view;

    if (move.speed !== speed) {
      move.speed = speed;
      const staged = move.staged;
      move.staged = null;
      view.path = null;
      this.update_move_overlay();
    }
  }

  move_stage(hex:number) {
    const move = this.move_action();
    const view = this.view;

    // limit down to the given hex
    let path = view?.path?.end;
    while (path && path.hex !== hex) {
      path = path.prev;
    }

    // set the stage
    if (move.selected_mech >= 0 && path && view.path) {
      view.path.end = path;
      move.staged = view.path;
    } else {
      move.staged = null;
    }
    this.update_move_overlay();
  }

  move_commit() {
    const move = this.move_action();
    const mech = this.active_mech();

    if (move.staged && mech) {

      // create the path
      const path:[number,Facing][] = [];
      for (let p = move.staged.end;; ) {
        path.unshift([p.hex,p.facing]);
        if (p.prev) {
          p = p.prev;
        } else {
          break;
        }
      }

      this.mimir.push({
        type: "move",
        mech_id: mech.id,
        speed: move.speed === 'walk' ? 0 : 1,
        path: path
      });

      this.clear_move();
    }
  }



  // ---- utilities
  active_mech() : Mech|null {
    const mid = this.move.selected_mech;
    const {mechs} = this.mimir;

    if (mid >= 0 && mid < mechs.length) {
      return mechs[mid];
    } else {
      this.move.selected_mech = -1;
      return null;
    }
  }

  clear_move() {
    const {move,view} = this;
    move.staged = null;
    move.selected_mech = -1;
    view.moveOverlay = null;
    view.path = null;
  }


  // ---- pathing
  path_update(dst:number, facing:Facing, moveOverlay:MoveOverlay) {
    const view = this.view;

    // check for ignorable
    const path_end = view?.path?.end;
    if (path_end && path_end.hex === dst && path_end.facing === facing) {
      return;
    }

    // init
    view.redraw = true;
    view.path = this.move.staged;

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
  update_move_overlay() {
    const mech = this.active_mech();
    const move = this.move;

    if (!mech) {
      this.view.moveOverlay = null;
    } else if (move.staged) {
      this.view.moveOverlay = this.move_overlay_for_mech(mech, move.speed, move.staged.end);
    } else {
      this.view.moveOverlay = this.move_overlay_for_mech(mech, move.speed);
    }
  }


  move_overlay_for_mech(mech:Mech, speed:Speed, waypoint?:PathStep) : MoveOverlay {
    const mode = (speed === 'walk') ? 0 : (speed === 'run') ? 1 : 2;
    const olay:MoveOverlay = { mech, mode, hexes:[] };
    const mps = (mode === 0) ? mech.mps_walk : mech.mps_run;
    const hexes = olay.hexes;
    const board = this.board;
    const blocked:boolean[] = [];

    // create the start location
    if (waypoint) {

      //
      while (waypoint.prev && waypoint.prev.hex === waypoint.hex)
        waypoint = waypoint.prev;
      for (let p=waypoint; p.prev; (p=p.prev)) {
        blocked[p.hex] = true;
      }

      // setup this point
      hexes[waypoint.hex] = [];
      hexes[waypoint.hex][waypoint.facing] = waypoint;
      visit_at(waypoint);

    } else {
      visit(mps, mech.hex, mech.facing);
    }

    function visit(mps:number, hex:number, facing:Facing, prev?:PathStep) {
      if (blocked[hex] && (!prev || prev.hex !== hex))  return;
      const olay_hex = hexes[hex] || (hexes[hex] = []);
      if (!olay_hex[facing] || (mps > olay_hex[facing].mps)) {
        const step = olay_hex[facing] = {mps,hex,facing,prev};
        visit_at(step);
      }
    }

    function visit_at(step:PathStep) {
      const {mps,facing,hex} = step;

      // rotation first
      if (mps >= 1) {
        visit(mps-1, hex, facing_rotate(facing,-1), step);
        visit(mps-1, hex, facing_rotate(facing,+1), step);
        if (mps >= 2) {
          visit(mps-2, hex, facing_rotate(facing,-2), step);
          visit(mps-2, hex, facing_rotate(facing,+2), step);
          if (mps >= 3) {
            visit(mps-3, hex, facing_rotate(facing,3), step);
          }
        }
      }

      // movement: forward
      if (mps > 0) {
        const next_hex = board.hex_by_facing(hex,facing);
        if (next_hex !== -1) {
          const xmps = mps - board.move_cost(hex,next_hex);
          if (xmps >= 0) {
            visit(xmps, next_hex, facing, step);
          }
        }
      }

      // movement: reverse
      if (mps > 0 && mode === 0) {
        const next_hex = board.hex_by_facing(hex,facing_rotate(facing,3));
        if (next_hex !== -1) {
          const xmps = mps - board.move_cost(hex,next_hex);
          if (xmps >= 0) {
            visit(xmps, next_hex, facing, step);
          }
        }
      }
    }

    return olay;
  }

};


