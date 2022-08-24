import {PATH_MECH_IMGS,PATH_HEX_IMGS} from './const'
import {GameState,Mech} from './game'


const TEAM_COLORS:[number,number,number][] = [
  [0,96,255],     // blue
  [238,75,43],    // red
  [0xff,0xb3,0],  // orange
];


export const window_any:any = window;

export interface Point {
  x: number;
  y: number;
}

export function point(x:number, y:number) {
  return {x,y}
}

export interface Dict<T> {
  [name:string]: T
}

export const Images = (() => {
  const images : Dict<{image:Image}> = {};
  let game : GameState|null = null;


  // ---- functions
  function for_mech(mech:Mech) {
    const imgkey = ['mech',mech.name,mech.team].join(':');
    return get_or_load(imgkey, () => new Promise((resolve,reject) => {
      var img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx:any = canvas.getContext('2d');

        // set the team color
        const color = TEAM_COLORS[mech.team];
        ctx.drawImage(img, 0, 0);
        const ximg = ctx.getImageData(0, 0, img.width, img.height);
        for (var i=0; i<ximg.data.length; i+=4) {
          if (ximg.data[i+3] === 255) {
            var n = (ximg.data[i]/255);
            ximg.data[i] = n * color[0];
            ximg.data[i+1] = n * color[1];
            ximg.data[i+2] = n * color[2];
          }
        }

        // extract the image back out
        ctx.putImageData(ximg, 0, 0);
        var nimg = new Image();
        nimg.src = canvas.toDataURL();
        resolve(nimg);
      };
      img.src = `${PATH_MECH_IMGS}/${mech.name}.png`
    }));
  }

  function get_or_load(key:string, loader:any) {

    // load if missing
    if (!images[key]) {
      const entry = images[key] = { image:new Image() };
      loader().then((image:any) => {
        entry.image = image;
        if (game)  game.dirty.mark();
      }).catch(() => console.error(`failed to load image: ${key}`));
    }

    return images[key].image;
  }

  function set_game(game_:GameState) {
    game = game_;
  }

  return {set_game,for_mech};
})();







export type Image = HTMLImageElement

type TileImage = {
  loaded: boolean
  image: Image
  promise: Promise<Image>
}

const tileset: Dict<TileImage> = {};

export function get_hex_image(name:string) {
  const tile = tileset[name];
  if (tile && tile.loaded) {
    return tile.image;
  } else {
    return null;
  }
}

export async function load_hex_image(name:string) {
  var tile = tileset[name];
  if (!tile) {
    const img = new Image()
    tile = tileset[name] = {
      loaded: false,
      image: img,
      promise: new Promise<HTMLImageElement>(resolve => {
        img.onload = () => {
          tile.loaded = true;
          resolve(img);
        }
        img.onerror = () => {
          console.log(`failed to load tile: ${name}`)
        }

        var url = `${PATH_HEX_IMGS}/${name}`
        if (!url.endsWith('.gif')) {
          url += '.png';
        }
        img.src = url;
      })
    }
  }

  return tile.promise;
}

async function load_hex_tiles_ary(names:string[]) {
  return Promise.all(names.map(n => load_hex_image(n)));
}

export async function load_hex_tiles(tiles:Dict<string[]>) {
  var promises : [string,Promise<Image[]>][] = [];
  promises = Object.keys(tiles).map(k => [k, load_hex_tiles_ary(tiles[k])])
  const rv : Dict<Image[]> = {};
  for (var e of promises) {
    rv[e[0]] = await e[1];
  }
  return rv;
}



