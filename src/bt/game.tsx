import {window_any,Point,point,load_mech_image} from './btutil'
import {Board} from './board'
import {HEX_H,HEX_W} from './const'

const TEAM_COLORS:[number,number,number][] = [
  [0,96,255],     // blue
  [238,75,43],    // red
  [0xff,0xb3,0],  // orange
];

const HEX_W4 = HEX_W / 4;
const HEX_H2 = HEX_H / 2;
const SQRT_3 = Math.sqrt(3);


type Facing = 0 | 1 | 2 | 3 | 4 | 5;


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
  drag_prev : Point|null = null;

  // debug
  paused = false;
  fps = false;
  fps_tms : number[] = [];
  show_hex_number = true;

  // movement
  move_overlay: MoveOverlay|null = null;
  path: Path = new Path();

  board = Board.empty();


  // --- methods
  hex_center(p:Point) {
    return point(
      p.x * (HEX_W/4) * 3 + (HEX_W/2),
      (p.y * 2 + (p.x%2) + 1) * (HEX_H/2));
  }

  hex_corner(x:number, y:number) {
    return point(
      x * (HEX_W/4) * 3,
      (y * 2 + (x%2)) * (HEX_H/2));
  }

  center_idx(idx:number) {
    const {x,y} = this.board.from_index(idx);
    return this.hex_center({x,y});
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


export class Mech {
  image: any;
  position = point(-1,-1);
  team_color = 'blue';
  facing:Facing = 1;
  mps_walk = 6;
  mps_run = 9;

  constructor(x:number, y:number, img_url:string, team:number) {
    this.position = point(x,y);

    load_mech_image(img_url, TEAM_COLORS[team]).then(img => {
      this.image = img;
    });
  }
}


export class GameState {
  view = new MapView();
  mechs:Mech[] = [];
  board = Board.empty();

  constructor() {
    window_any.game = this;
    window_any.view = this;

    this.mechs.push(new Mech(0,0,'Daimyo',0));
    this.mechs.push(new Mech(0,1,'Wolverine',1));
    this.mechs.push(new Mech(2,3,'ZeusX_X3',2));
    this.mechs.push(new Mech(1,6,'jabberwocky_65a',1));
    this.mechs[0].facing = 2;

    for (var i=0; i<this.mechs.length; i++) {
      this.mechs[i].facing = (i%6) as Facing;
    }


  }

  set_board(board:Board) {
    this.board = board;
    this.view.board = board;
    this.view.redraw = true;


    const mech = this.mechs[2];
    const orig_hex = this.board.index_of(mech.position.x, mech.position.y);
    const olay = this.move_overlay(orig_hex, mech.facing, mech.mps_run);
    this.view.move_overlay = olay;
  }


  // ---- pathing
  path_update(dst:number, facing:Facing) {
    if (!this.view.path)  return;
    const path = this.view.path;

    // check for ignorable
    if (path.facing === facing && path.hexes[path.hexes.length-1] === dst)
      return;
    this.view.redraw = true;

    // get the movement overlay
    path.hexes = [];
    path.mps = [];
    if (!this.view.move_overlay || !this.view.move_overlay.hexes[dst])
      return;
    const overlay = this.view.move_overlay.hexes;
    path.mode = this.view.move_overlay.mode;

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
      path.mps.unshift(next.mps);
      if (next.from === hex)  break;
      hex = next.from;
      facing = next.face;
    }
  }


  // --- overlay
  move_overlay(orig:number, orig_face:Facing, mps:number) : MoveOverlay {
    const board = this.board;
    const olay:OlayHex[] = [];

    function step(hex:number, from:number, face:Facing, mps:number) {
      if (hex !== from)  mps -= board.move_cost(from,hex);
      if (mps < 0)  return;

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
    return {mode:1, hexes:olay}
  }

};


