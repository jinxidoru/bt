import {useRef,useMemo,MouseEvent} from 'react'
import react from 'react'
import {useAnimate,useWindowEvent} from './react-utils'
import {point} from './btutil'
import {HEX_W, HEX_H, HEX_DX} from './const'
import {GameState,MapView} from './game'
import {useSelector, ACTION} from './store'
import {useDispatch} from 'react-redux'


const SCALE_MAX = 5;
const SCALE_FACTIONOR = 0.005;
const TAU = Math.PI * 2;
const MAX_GUTTER = 400;




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


export const BtCanvas : React.FC<{game:GameState}> = ({game}) => {
  const canvasRef = useRef<any>()
  const {view} = game;
  const dispatch = useDispatch();

  const speed = useSelector(state => state.game.move.speed);
  const is_staged = useSelector(state => state.game.move.staged.length > 0);
  const mech_id = useSelector(state => state.game.move.selected_mech);
  const curMech = (mech_id>=0) ? game.mechs[mech_id] : null;

  view.redraw = true;


  // ---- various flags, etc
  // get the movement overlay
  const moveOverlay = view.moveOverlay = useMemo(() => {
    game.view.path = null;
    //setFreeze(false);
    return curMech && game.move_overlay_for_mech(curMech,speed);
  }, [curMech,speed,game]);

  // redraw after resize
  useWindowEvent('resize', () => { view.redraw = true; });

  useAnimate((tm:number) => {
    renderCanvas(tm, view, game, canvasRef.current);
  });


  // --- view movement
  function to_view_xy(e:MouseEvent) {
    const brect = canvasRef.current.getBoundingClientRect();
    return [
      (e.clientX - brect.x) / view.scale + view.ox,
      (e.clientY - brect.y) / view.scale + view.oy
    ];
  }

  function onMouseMove(e:MouseEvent) {

    // dragging the view
    if (view.drag_prev) {
      view.ox -= (e.clientX - view.drag_prev.x) / view.scale;
      view.oy -= (e.clientY - view.drag_prev.y) / view.scale;
      view.drag_prev = point(e.clientX, e.clientY);
      view.redraw = true;

    // pathing
    } else if (moveOverlay && !is_staged) {
      const [vx,vy] = to_view_xy(e);
      const hex = view.hex_from_view_xy(vx, vy);
      const facing = view.facing_from_view_xy(hex, vx, vy);
      game.path_update(hex, facing, moveOverlay);
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
    view.scale -= e.deltaY * SCALE_FACTIONOR;
    view.scale = in_range(view.scale, 0.1, SCALE_MAX);
    const dS = view.scale - S;

    const brect = canvasRef.current.getBoundingClientRect();
    const vx = e.clientX - brect.x;
    const vy = e.clientY - brect.y;

    view.ox += ((dS/S) * vx) / (S+dS);
    view.oy += ((dS/S) * vy) / (S+dS);
    view.redraw = true;
  }

  function onContextMenu(ev:MouseEvent) {
    dispatch(ACTION.move_select(-1));
    ev.preventDefault();
  }

  function onClick(ev:MouseEvent) {
    const [vx,vy] = to_view_xy(ev);
    const hex = view.hex_from_view_xy(vx, vy);
    const facing = view.facing_from_view_xy(hex, vx, vy);

    // unstage the path
    if (is_staged) {
      dispatch(ACTION.move_stage([]));
      if (moveOverlay) {
        game.path_update(hex, facing, moveOverlay);
      }
      return;
    }

    // select a mech
    let mech = game.mechs.find(m => (m.hex === hex));
    if (mech && mech !== curMech) {
      dispatch(ACTION.move_select(mech.id));
      return;
    }

    // stage a path
    if (view.path) {
      if (view.path.hexes[view.path.hexes.length-1] === hex) {
        dispatch(ACTION.move_stage([1]));
        return;
      }
    }
  }

  return (<div className="bt-center">
    <canvas width="800" height="800" ref={canvasRef}
      onMouseMove={onMouseMove} onMouseDown={onMouseDown}
      onMouseUp={stopDrag} onMouseLeave={stopDrag}
      onWheel={onWheel} onContextMenu={onContextMenu}
      onClick={onClick}
      />
  </div>);
}



function renderCanvas(tm:number, view:MapView, game:GameState, canvas:any) {
  const {moveOverlay,board} = view;

  // setup the metrics display
  const metrics:any = {...view.debug};
  calcFps();

  // check for redraw
  if (view.paused)  return;
  if (!view.redraw)  return;
  view.redraw = false;

  // resize the canvas
  if (!canvas || !canvas.getContext)  return;
  const prect = canvas.parentNode.getBoundingClientRect()
  canvas.width = prect.width - 2;
  canvas.height = prect.height - 2;

  // clear the canvas
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#333'
  ctx.fillRect(0,0,canvas.width, canvas.height);

  // get hex view limits
  adjustView();
  const max_view = point(
    view.ox + canvas.width / view.scale,
    view.oy + canvas.height / view.scale);
  const min_hex_x = Math.max(0,Math.floor((view.ox-(HEX_W/4)) / HEX_DX));
  const min_hex_y = Math.max(0,Math.floor((view.oy-(HEX_H/2)) / HEX_H));
  const max_hex_x = Math.min(board.width-1, Math.floor(max_view.x / HEX_DX));
  const max_hex_y = Math.min(board.height-1, Math.floor(max_view.y / HEX_H));

  // draw functions
  drawMap();
  drawGrid();
  drawMechs();
  drawMoveOverlay();
  drawPath();
  drawMetrics();


  // ---- functions
  // double check all the scale and translation values to make sure the viewport is valid.
  function adjustView() {

    // get the edges
    const mx = board.width * (HEX_W/4) * 3 + (HEX_W/4);
    const my = board.height * HEX_H + (HEX_H/2);
    const edge = point(mx,my);
    const min_scale = Math.max(
      canvas.width/(edge.x+MAX_GUTTER),
      canvas.height/(edge.y+MAX_GUTTER));

    // enforce limits
    const scale = view.scale = in_range(view.scale, min_scale, SCALE_MAX);
    view.ox = in_range(view.ox, -MAX_GUTTER, edge.x - canvas.width/scale + MAX_GUTTER);
    view.oy = in_range(view.oy, -MAX_GUTTER, edge.y - canvas.height/scale + MAX_GUTTER);

    // setup the transform
    ctx.setTransform(scale,0,0,scale, -view.ox * scale, -view.oy * scale);
  }


  function drawMap() {
    ctx.save();
    const dx = HEX_DX;
    var px = min_hex_x * dx;
    for (var i=min_hex_x; i<=max_hex_x; i++, px += dx) {
      var py = ((i%2) ? (HEX_H/2) : 0) + (min_hex_y * HEX_H);
      for (var j=min_hex_y; j<=max_hex_y; j++, py += HEX_H) {
        const hex = board.hex(i,j);
        ctx.drawImage(hex.tile_base, px, py, HEX_W, HEX_H);
        for (var extra of hex.tile_extra) {
          ctx.drawImage(extra, px, py, HEX_W, HEX_H);
        }

        // draw the hex number
        if (view.show_hex_number) {
          ctx.lineWidth = 3;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '6pt courier';
          ctx.fillStyle = 'white';
          const hexn = board.index_of(i,j);
          ctx.fillText(`${hexn}`, px + (HEX_W/2), py + 8);
        }
      }
    }
    ctx.restore();
  }


  function drawMechs() {
    for (const mech of game.mechs) {
      if (mech.image && mech.hex >= 0) {
        const px = view.center_idx(mech.hex);
        const img = mech.image;
        const ir = HEX_W * (5/6);
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
    const transform = ctx.getTransform();
    ctx.resetTransform();
    const scale = view.scale;
    const xoff = -view.ox * scale;
    const yoff = -view.oy * scale;
    const h = HEX_H * scale;
    const w = HEX_W * scale;
    const a = (w/4);
    const b = a * 3;
    const c = (h/2);

    ctx.strokeStyle = '#ccc';
    for (var x=0; x<board.width; x++) {
      for (var y=0; y<board.height; y++) {
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

    ctx.setTransform(transform);
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
    ctx.resetTransform();

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
      boxHeight += ipad*2 + tpad * (lines.length-1);
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


  function drawPath() {
    if (!view.path)  return;
    const path = view.path;
    ctx.save();

    // select the colors
    const mode = path.mode
    const c1 = (mode===0) ? 'white' : (mode===1) ? 'black' : (mode===2) ? 'red' : 'yellow';
    const c2 = (mode===0 || mode===3) ? 'black' : 'white';

    // draw the lines
    ctx.strokeStyle = c1;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i=0; i<path.hexes.length; i++) {
      let {x,y} = view.center_idx(path.hexes[i]);
      ctx.lineTo(x,y);
    }
    ctx.stroke();

    // draw the circles
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '8pt impact';
    for (let i=0; i<path.hexes.length; i++) {
      let {x,y} = view.center_idx(path.hexes[i]);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, TAU);
      ctx.fillStyle = c2;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = c1;
      ctx.fillText(path.mps[i] || 0, x, y);

      if (i === (path.hexes.length-1)) {
        ctx.beginPath();
        ctx.arc(x, y, 16, (path.facing-2) * (Math.PI/3), (path.facing-1) * (Math.PI/3));
        ctx.stroke();
      }
    }

    ctx.restore();
  }


  function drawMoveOverlay() {
    if (!moveOverlay)  return;

    // set the fill style
    const styles = ['rgba(255,255,255,.7)','rgba(0,0,0,.4)']
    ctx.fillStyle = styles[moveOverlay.mode];

    // draw each hex
    const hexes = moveOverlay.hexes;
    for (let i=0; i<hexes.length; i++) {
      if (hexes[i]) {
        let pt = view.center_idx(i);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, TAU);
        ctx.fill();
      }
    }
  }
}
