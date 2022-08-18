import {window_any,Point,point,load_mech_image} from './btutil'
import {Board} from './board'
import {HEX_H,HEX_W} from './const'

const TEAM_COLORS:[number,number,number][] = [
  [0,96,255],     // blue
  [238,75,43],    // red
  [0xff,0xb3,0],  // orange
];


export class MapView {
  board: Board|null = null

  // draw settings
  redraw = true;

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
};


export class Mech {
  image: any;
  position = point(-1,-1);
  team_color = 'blue';
  facing = 1;

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

  constructor() {
    window_any.game = this;
    window_any.view = this;

    this.mechs.push(new Mech(0,0,'Daimyo',0));
    this.mechs.push(new Mech(0,1,'Wolverine',1));
    this.mechs.push(new Mech(2,3,'ZeusX_X3',2));
    this.mechs.push(new Mech(1,6,'jabberwocky_65a',1));
    this.mechs[0].facing = 2;

    for (var i=0; i<this.mechs.length; i++) {
      this.mechs[i].facing = i%6;
    }
  }
};
