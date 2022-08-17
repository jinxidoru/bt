import {useState,useRef,useEffect,MouseEvent} from 'react'
import react from 'react'
import * as btutil from './btutil'
import "./main.scss"


const SCALE_MAX = 5;
const SCALE_FACTOR = 0.005;
const TAU = Math.PI * 2;

const TEAM_COLORS:[number,number,number][] = [
  [0,96,255],     // blue
  [238,75,43],    // red
  [0xff,0xb3,0],  // orange
];



interface Point {
  x: number;
  y: number;
}


function point(x:number, y:number) {
  return {x,y}
}



class MapView {

  // draw settings
  redraw = true;

  // size
  map_width = 40;
  map_height = 90;

  // hex drawing
  hexw = 84;
  hexh = 72;

  // transform
  scale = 1.5
  ox = 0
  oy = 0

  // state
  drag_prev : Point|null = null;

  // debug
  paused = false;
  fps = false;
  fps_tms : number[] = [];


  // --- methods
  hex_center(p:Point) {
    const h = this.hexh;
    const w = this.hexw;
    return point(
      p.x * (w/4) * 3 + (w/2),
      (p.y * 2 + (p.x%2) + 1) * (h/2));
  }

  hex_corner(x:number, y:number) {
    const h = this.hexh;
    const w = this.hexw;
    return point(
      x * (w/4) * 3,
      (y * 2 + (x%2)) * (h/2));
  }

  hex_dx() {
    return (this.hexw*3) / 4;
  }

};


class Mech {
  image: any;
  position = point(-1,-1);
  team_color = 'blue';
  facing = 1;

  constructor(x:number, y:number, img_url:string, team:number) {
    this.position = point(x,y);

    btutil.load_mech_image(img_url, TEAM_COLORS[team]).then(img => {
      this.image = img;
    });
  }
}


class GameState {
  view = new MapView();
  mechs:Mech[] = [];
};




var anyWindow:any = window;


const game = new GameState();
const view = game.view;

anyWindow.game = game;
anyWindow.view = view;



game.mechs.push(new Mech(0,0,'Daimyo',0));
game.mechs.push(new Mech(0,1,'Wolverine',1));
game.mechs.push(new Mech(2,3,'ZeusX_X3',2));
game.mechs.push(new Mech(1,6,'jabberwocky_65a',1));
game.mechs[0].facing = 2;

for (var i=0; i<game.mechs.length; i++) {
  game.mechs[i].facing = i%6;
}


export function BtMain() {
  return (<div className="bt-root"><BtCanvas /></div>);
}


function useAnimate(fn:any) {
  const animateRef = useRef<number>(-1);

  const animate = (time:any) => {
    animateRef.current = requestAnimationFrame(animate);
    fn(time);
  }

  useEffect(() => {
    animateRef.current = window.requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animateRef.current);
  });
}


function in_range(v:number, min:number, max:number) {
  if (v < min)  v = min;
  if (v > max)  v = max;
  return v;
}


function with_rotation(ctx:any, x:number, y:number, a:number, fn:any) {
  const saved = ctx.getTransform();
  const sin = Math.sin;
  const cos = Math.cos;
  ctx.transform(cos(a),sin(a),-sin(a),cos(a),x-x*cos(a)+y*sin(a),y-x*sin(a)-y*cos(a));
  fn();
  ctx.setTransform(saved);
}




function BtCanvas() {
  const canvasRef = useRef<any>()

  useAnimate((tm:number) => {
    const view = game.view;

    // setup the metrics display
    const metrics:any = {};
    calcFps();

    // check for redraw
    if (view.paused)  return;
    if (!view.redraw)  return;
    view.redraw = false;

    // resize the canvas
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext)  return;
    const prect = canvas.parentNode.getBoundingClientRect()
    canvas.width = prect.width + 8;
    canvas.height = prect.height + 8;

    // clear the canvas
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width, canvas.height);

    // get hex view limits
    adjustView();
    const max_view = point(
      view.ox + canvas.width / view.scale,
      view.oy + canvas.height / view.scale);
    const min_hex_x = Math.max(0,Math.floor((view.ox-(view.hexw/4)) / view.hex_dx()));
    const min_hex_y = Math.max(0,Math.floor((view.oy-(view.hexh/2)) / view.hexh));
    const max_hex_x = Math.min(view.map_width-1, Math.floor(max_view.x / view.hex_dx()));
    const max_hex_y = Math.min(view.map_height-1, Math.floor(max_view.y / view.hexh));

    // draw with transform
    drawMap();
    drawMechs();

    // draw without transform
    ctx.resetTransform();
    drawGrid();
    drawMetrics();


    // ---- functions
    // double check all the scale and translation values to make sure the viewport is valid.
    function adjustView() {

      // get the edges
      const mx = view.map_width * (view.hexw/4) * 3 + (view.hexw/4);
      const my = view.map_height * view.hexh + (view.hexh/2);
      const edge = point(mx,my);
      const min_scale = Math.max(canvas.width/edge.x, canvas.height/edge.y);

      // enforce limits
      const scale = view.scale = in_range(view.scale, min_scale, SCALE_MAX);
      view.ox = in_range(view.ox, 0, edge.x - canvas.width/scale);
      view.oy = in_range(view.oy, 0, edge.y - canvas.height/scale);

      // setup the transform
      ctx.setTransform(scale,0,0,scale, -view.ox * scale, -view.oy * scale);
    }


    function drawMap() {
      const dx = view.hex_dx();
      var px = min_hex_x * dx;
      for (var i=min_hex_x; i<=max_hex_x; i++, px += dx) {
        var py = ((i%2) ? (view.hexh/2) : 0) + (min_hex_y * view.hexh);
        for (var j=min_hex_y; j<=max_hex_y; j++, py += view.hexh) {
          var n = ((i+j)%14) - 3;
          var img = btutil.get_hex_image(`tundra_${n}`);
          if (img) {
            ctx.drawImage(img, px, py, view.hexw, view.hexh);
          }
        }
      }
    }


    function drawMechs() {
      for (const mech of game.mechs) {
        if (mech.image && mech.position.x >= 0 && mech.position.y >= 0) {
          const px = view.hex_center(mech.position);
          const img = mech.image;
          const ir = view.hexw * (5/6);
          with_rotation(ctx, px.x, px.y, mech.facing * (TAU/6), () => {
            const is = Math.min(ir/img.width, ir/img.height);
            const dw = is * img.width;
            const dh = is * img.height;
            ctx.drawImage(mech.image, px.x - dw/2, px.y - dh/2, dw, dh);
          })
        }
      }
    }

    // the grid is meant to be drawn on everything else
    function drawGrid() {
      const scale = view.scale;
      const xoff = -view.ox * scale;
      const yoff = -view.oy * scale;
      const h = view.hexh * scale;
      const w = view.hexw * scale;
      const a = (w/4);
      const b = a * 3;
      const c = (h/2);

      ctx.strokeStyle = '#ccc';
      for (var x=0; x<view.map_width; x++) {
        for (var y=0; y<view.map_height; y++) {
          const xp = x * b + xoff;
          const yp = (y+1) * h - ((x%2) ? 0 : c) + yoff;

          ctx.beginPath();
          ctx.lineTo(xp, yp);
          ctx.lineTo(xp + a, yp - c);
          ctx.lineTo(xp + b, yp - c);
          ctx.lineTo(xp + w, yp);
          ctx.lineTo(xp + b, yp + c);
          ctx.lineTo(xp + a, yp + c);
          ctx.lineTo(xp, yp);
          ctx.stroke();
        }
      }
    }

    function calcFps() {
      if (view.fps) {

        // update the tracker
        const tms = view.fps_tms;
        tms.push(tm);
        while (tms.length > 60)  tms.shift();

        // display
        if (tms.length > 3) {
          metrics['fps'] = Math.ceil(1000 * tms.length / (tm - tms[0]));
        }
      }
    }

    function drawMetrics() {

      // draw the metrics
      const lines = Object.keys(metrics)
        .map(x => [x,metrics[x]])
        .sort((a,b) => a[0].localeCompare(b[0]))
        .map(x => {
          var val = x[1];
          if (Array.isArray(val)) {
            val = x[1].join(',');
          }
          return `${x[0]} : ${val}`
        })

      if (lines.length > 0) {

        // measure the box size
        var boxWidth = 0;
        var boxHeight = 0;
        var lineHeight = 0;
        ctx.font = '13px monospace';
        lines.forEach(ln => {
          const dim = ctx.measureText(ln);
          boxWidth = Math.max(dim.width, boxWidth);
          lineHeight = dim.actualBoundingBoxAscent + dim.actualBoundingBoxDescent;
          boxHeight += lineHeight;
        });

        // draw the box
        const opad = 20;
        const ipad = 10;
        const tpad = 5;
        boxWidth += ipad*2;
        boxHeight += ipad + tpad * (lines.length-1);
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.beginPath();
        ctx.rect(canvas.width - boxWidth - opad, opad, boxWidth, boxHeight)
        ctx.fill();
        ctx.stroke();

        // draw the text
        ctx.fillStyle = "red";
        var ypos = opad + ipad + lineHeight - 2;
        lines.forEach(ln => {
          ctx.fillText(ln, canvas.width - boxWidth - opad + ipad, ypos);
          ypos += lineHeight + tpad;
        });
      }
    }

  });



  // --- view movement
  function onMouseMove(e:MouseEvent) {

    // dragging the view
    if (view.drag_prev) {
      view.ox -= (e.clientX - view.drag_prev.x) / view.scale;
      view.oy -= (e.clientY - view.drag_prev.y) / view.scale;
      view.drag_prev = point(e.clientX, e.clientY);
      view.redraw = true;
    }
  }

  function onMouseDown(e:MouseEvent) {
    view.drag_prev = point(e.clientX, e.clientY);
  }

  function stopDrag(e:MouseEvent) {
    view.drag_prev = null;
  }

  function onWheel(e:react.WheelEvent) {
    const S = view.scale;
    view.scale -= e.deltaY * SCALE_FACTOR;
    view.scale = in_range(view.scale, 0.1, SCALE_MAX);
    const dS = view.scale - S;

    const brect = canvasRef.current.getBoundingClientRect();
    const vx = e.clientX - brect.x;
    const vy = e.clientY - brect.y;

    view.ox += ((dS/S) * vx) / (S+dS);
    view.oy += ((dS/S) * vy) / (S+dS);
    view.redraw = true;
  }


  return (
    <canvas width="800" height="800" ref={canvasRef}
      onMouseMove={onMouseMove} onMouseDown={onMouseDown}
      onMouseUp={stopDrag} onMouseLeave={stopDrag}
      onWheel={onWheel} />
  );
}
