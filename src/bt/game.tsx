import {window_any,Point,point,Images} from './btutil'
import {Board} from './board'
import {HEX_H,HEX_W} from './const'

const HEX_W4 = HEX_W / 4;
const HEX_H2 = HEX_H / 2;
const SQRT_3 = Math.sqrt(3);


// --- types
export type Facing = 0 | 1 | 2 | 3 | 4 | 5;
export type Mech = ReturnType<typeof new_mech>


class Path {
  mode: 0|1|2|3 = 0;   // walk, run, jump, sprint
  hexes: number[] = [50];
  mps: number[] = [0];
  facing: Facing = 2;
  mp_total = 5;
}


interface MoveOverlay {
  mode: 0|1|2|3
  hexes: OlayHex[]
}

interface OlayHex {
  faces: OlayStep[]
}

interface OlayStep {
  mps: number;
  from: number;
  face: Facing;
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
  mechs: Mech[] = [];

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

  constructor() {
    window_any.game = this;
    window_any.view = this;
  }

  set_board(board:Board) {
    this.board = board;
    this.view.board = board;
    this.view.redraw = true;
  }





  // ---- pathing
  path_update(dst:number, facing:Facing, moveOverlay:MoveOverlay) {
    const view = this.view;

    // check for ignorable
    if (view.path) {
      const path = view.path;
      if (path.facing === facing && path.hexes[path.hexes.length-1] === dst)
        return;
    }

    // create a new path
    const path = view.path = new Path();
    view.redraw = true;

    // get the movement overlay
    path.hexes = [];
    path.mps = [];
    if (!moveOverlay.hexes[dst]) return;
    const overlay = moveOverlay.hexes;
    path.mode = moveOverlay.mode;

    // find workable facing
    if (!overlay[dst].faces[facing]) {
      const nfacing = [facing+1,facing+5,facing+2,facing+4,facing+3]
        .map(x => (x%6)).find(f => (overlay[dst].faces[f]));
      if (nfacing === undefined)  return;
      facing = nfacing as Facing;
    }
    path.facing = facing;

    // follow the path
    let hex = dst;
    while (true) {
      const next = overlay[hex].faces[facing];
      path.hexes.unshift(hex);
      if (hex === dst) {
        path.mps.unshift(next.mps);
      } else {
        path.mps.unshift(overlay[hex].faces[next.face].mps);
      }
      if (next.from === hex)  break;
      hex = next.from;
      facing = next.face;
    }

  }


  // --- overlay
  move_overlay_for_mech(mech:Mech, speed:string) : MoveOverlay {
    const orig = mech.hex;
    const orig_face = mech.facing;
    const mode = (speed === 'walk') ? 0 : (speed === 'run') ? 1 : 2;
    const mps = (mode === 0) ? mech.mps_walk : mech.mps_run;
    const board = this.board;
    const olay:OlayHex[] = [];

    const step = (hex:number, from:number, face:Facing, mps:number) => {
      if (hex !== from)  mps -= board.move_cost(from,hex);
      if (mps < 0)  return;
      if (this.is_obstructed(hex,mech.team))  return;

      // initialize
      let cur = olay[hex];
      if (!cur) {
        cur = olay[hex] = {faces:[]};
      }

      // populate each face
      for (var i=0; i<6; i++) {
        let xface = ((face+i) % 6) as Facing;
        let xmps = mps - ((i>3) ? (6-i) : i);
        if (xmps >= 0) {
          if (!cur.faces[xface] || cur.faces[xface].mps < xmps) {
            cur.faces[xface] = { mps:xmps, from:from, face:face };
            if (xmps > 0) {
              let next_hex = board.hex_by_facing(hex, xface);
              if (next_hex !== -1) {
                step(next_hex, hex, xface, xmps);
              }
            }
          }
        }
      }
    }

    step(orig,orig,orig_face,mps);
    return {mode, hexes:olay}
  }


  is_obstructed(hex:number, team:number = -1) {

    // check for a mech
    for (let mech of this.view.mechs) {
      if ((mech.team !== team) && (mech.hex === hex)) {
        return true;
      }
    }

    return false;
  }

};


