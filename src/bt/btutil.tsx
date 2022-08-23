import {PATH_MECH_IMGS,PATH_HEX_IMGS} from './const'
import {MapView} from './game'


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


//! Load an image and then apply the given color.
export async function load_mech_image(name:string, team:number) {
  const color = TEAM_COLORS[team];

  return new Promise((resolve) => {
    var img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx:any = canvas.getContext('2d');

      // get the image data
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
    img.src = `${PATH_MECH_IMGS}/${name}.png`
  });
}


type ImageEntry = {
  image: Image;
  promise: Promise<Image>;
}


export const Images = (() => {
  const images : Dict<ImageEntry> = {};
  let view : MapView|null = null;


  // ---- functions
  function load_mech(name:string, team:number) {
    const color = TEAM_COLORS[team];

    // choose a key
    const key = `img:${name}:${team}`
    if (images[key])  return key;

    // create the entry
    const entry = images[key] = {
      image: new Image(),
      promise: new Promise(resolve => {
        var img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx:any = canvas.getContext('2d');

          // get the image data
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
          entry.image = nimg;

          if (view) {
            view.redraw = true;
          }
        };
        img.src = `${PATH_MECH_IMGS}/${name}.png`
      })
    };

    return key;
  }

  function get(key:string) {
    if (images[key]) {
      return images[key].image;
    } else {
      return new Image();
    }
  }

  function set_view(view_:MapView) {
    view = view_;
  }

  return {load_mech,get,set_view};
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



