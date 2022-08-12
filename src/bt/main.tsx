import {useState,useRef,useEffect,MouseEvent} from 'react'
import react from 'react'
import "./main.scss"



const SCALE_MAX = 5;
const SCALE_FACTOR = 0.005;



interface Point {
  x: number;
  y: number;
}


function point(x:number, y:number) {
  return {x,y}
}



class MapView {

  // size
  hex_width = 40;
  hex_height = 40;
  hex_radius = 20;


  // transform
  scale = 1
  ox = 0
  oy = 0

  // state
  drag_prev : Point|null = null;

  // debug
  paused = false;
  fps = false;
  fps_tms : number[] = [];


  // --- methods

};


class GameState {
  view = new MapView();


};


var anyWindow:any = window;


const game = new GameState();
const view = game.view;

anyWindow.game = game;
anyWindow.view = view;




export function BtMain() {
  const [show,set_show] = useState(true);

  return (<div className="bt-root">
    <button onClick={() => set_show(!show)}>Click Me</button>
    <br/>
    {show ? (<BtCanvas />) : null}
  </div>)
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



function BtCanvas() {
  const canvasRef = useRef<any>()

  useAnimate((tm:number) => {
    const view = game.view;
    if (view.paused)  return;

    // clear the canvas
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext)  return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width, canvas.height);

    // get the edges
    const r = view.hex_radius;
    const sin = [0,1,2,3,4,5].map(n => r*Math.sin(2 * n * (Math.PI/6)));
    const cos = [0,1,2,3,4,5].map(n => r*Math.cos(2 * n * (Math.PI/6)));
    const mx = Math.ceil(2*r + (r+cos[1]) * (view.hex_width-1));
    const my = Math.ceil(sin[1]*(2*view.hex_height+1));
    const edge = point(mx,my);
    const min_scale = Math.max(canvas.width/edge.x, canvas.height/edge.y);

    // enforce limits
    const scale = view.scale = in_range(view.scale, min_scale, SCALE_MAX);
    view.ox = in_range(view.ox, 0, edge.x - canvas.width/scale);
    view.oy = in_range(view.oy, 0, edge.y - canvas.height/scale);

    // setup the transform
    ctx.setTransform(view.scale,0,0, view.scale, -view.ox * view.scale, -view.oy * view.scale);

    // draw hex grid
    drawHexGrid(view.hex_width, view.hex_height);

    // draw the FPS in the top corner
    if (view.fps) {

      // update the tracker
      const tms = view.fps_tms;
      tms.push(tm);
      while (tms.length > 60)  tms.shift();

      // display
      if (tms.length > 3) {
        const fps = Math.ceil(1000 * tms.length / (tm - tms[0]));
        ctx.setTransform(1,0,0,1,0,0);
        ctx.font = '13px monospace';
        ctx.fillStyle = "red";
        ctx.fillText(`${fps} fps`, canvas.width - 55, 20);
      }
    }


    // ---- functions
    function drawHexColumn(x:number, y:number, n:number) {
      for (var j=0; j<n; j++) {

        // draw the hex
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
          ctx.lineTo(x + cos[i], y + sin[i]);
        }
        ctx.closePath();
        ctx.stroke();

        // next
        y += sin[1]*2;
      }
    }

    function drawHexGrid(xn:number, yn:number) {
      var x = r;
      var y = sin[1];

      ctx.strokeStyle = '#ccc';
      for (var i=0; i<xn; i++) {
        drawHexColumn(x,y,yn);
        x += r + cos[1];
        y += ((i%2) ? -1 : 1) * sin[1];
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
  }




  return (
    <canvas width="800" height="800" ref={canvasRef}
      onMouseMove={onMouseMove} onMouseDown={onMouseDown}
      onMouseUp={stopDrag} onMouseLeave={stopDrag}
      onWheel={onWheel} />
  );
}
