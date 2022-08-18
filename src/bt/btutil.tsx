import {PATH_MECH_IMGS,PATH_HEX_IMGS} from './const'


export interface Dict<T> {
  [name:string]: T
}


//! Load an image and then apply the given color.
export async function load_mech_image(name:string, color:[number,number,number]) {
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



