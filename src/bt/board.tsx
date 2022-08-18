import {Image,load_hex_tiles} from './btutil'


function iseq(size:number) {
  return Array.from(Array(size).keys());
}


export class Board {
  hexes: Hex[] = [];

  constructor(
      public width:number, public height:number,
      public tile_dflt:Image
  ) {
    const size = width * height;
    this.hexes = iseq(size).map(() => new Hex(tile_dflt));
  }

  static empty() {
    let blank = new window.Image(84,72);
    return new Board(0,0,blank);
  }

  static load(name:string) {
    if (name === 'grasslands_2') {
      return load_grasslands();
    } else {
      throw new Error(`unknown board: ${name}`)
    }
  }

  hex(x:number, y:number) {
    return this.hexes[this.width * y + x];
  }

  hex_at(x:number, y:number) {
    if ((x<0) || (y<0) || (x>=this.width) || (y>=this.height)) {
      return null;
    } else {
      return this.hex(x,y);
    }
  }

  from_index(idx:number) {
    let x = idx % this.width;
    let y = Math.floor(idx / this.width);
    return {x,y};
  }

  index_of(x:number, y:number) {
    if ((x<0) || (y<0) || (x>=this.width) || (y>=this.height)) {
      return -1;
    } else {
      return (this.width * y + x);
    }
  }

  borders(x:number, y:number) {
    const dy = (x%2) ? 0 : -1;
    return [
      this.hex_at(x,y-1),
      this.hex_at(x+1,y+dy),
      this.hex_at(x+1,y+dy+1),
      this.hex_at(x,y+1),
      this.hex_at(x-1,y+dy+1),
      this.hex_at(x-1,y+dy),
    ]
  }

  hex_by_facing(src:number, facing:number) : number {
    let x = src % this.width;
    let y = Math.floor(src / this.width);
    if (facing === 0) {
      y--;
    } else if (facing === 1) {
      x++;
      y -= (x%2)
    } else if (facing === 2) {
      y += (x%2);
      x++;
    } else if (facing === 3) {
      y++
    } else if (facing === 4) {
      y += (x%2);
      x--;
    } else if (facing === 5) {
      x--;
      y -= (x%2);
    }
    return this.index_of(x,y);
  }


  // ---- moving
  move_cost(src:number, dst:number) {
    const dhex = this.hexes[dst];
    const shex = this.hexes[src];
    let mp = 1 + dhex.woods + (dhex.rough?1:0) + Math.abs(shex.level - dhex.level);
    return mp;
  }
}


export class Hex {
  level = 0;
  depth = 0;
  rough = false;
  woods = 0;
  tile_extra : Image[] = []

  constructor(public tile_base:Image) {}
}


async function load_grasslands() {
  const tiles = await load_hex_tiles({
    grass: iseq(10).map(n => `grass/grass_plains_${n}.gif`),
    water: [1,2,3,4].map(n => `boring/blue_water_${n}.gif`),
    rough: ['a','b','c','d'].map(n => `saxarba/theme_grass/rough_grass_${n}`),
    hwoods: ['a','b','c','d'].map(n => `saxarba/theme_grass/woods_heavy_grass_${n}`),
    lwoods: ['a','b','c','d','e','f'].map(n => `saxarba/theme_grass/woods_light_grass_${n}`),
    incline: iseq(63).map(i => {
      var n = (i>=9) ? `${i+1}` : `0${i+1}`;
      return `High_Incline/Default/High_Incline_Top_Grass_${n}`
    })

  });
  const board = new Board(16,17,tiles.grass[0]);


  gl_hexes.forEach((h:any[],n) => {
    const level = h[0];
    const terrain = h[1];
    const hex = board.hexes[n];

    if (level > 0) {
      hex.level = level;
      hex.tile_base = tiles.grass[level];
    }

    terrain.forEach((x:string) => {
      if (x.startsWith('water:')) {
        var depth = ~~x.substr(6);
        hex.tile_base = tiles.water[depth - 1];
        hex.depth = depth;

      } else if (x === 'rough:1:20') {
        hex.rough = true;
        hex.tile_extra.push(tiles.rough[n % tiles.rough.length]);

      } else if (x === 'woods:1:20') {
        hex.woods = 1;
        hex.tile_extra.push(tiles.lwoods[n % tiles.lwoods.length]);

      } else if (x === 'woods:2:20') {
        hex.woods = 2;
        hex.tile_extra.push(tiles.hwoods[n % tiles.hwoods.length]);
      }
    });
  });

  // attach the inclines
  for (var x=0; x<board.width; x++) {
    for (var y=0; y<board.height; y++) {
      const hex = board.hex(x,y);
      if (hex.level > 0) {
        let incline = 0;
        const borders = board.borders(x,y);
        borders.forEach((h,n) => {
          if (h && h.level < hex.level) {
            incline += (1<<n);
          }
        });
        if (incline > 0) {
          hex.tile_extra.unshift(tiles.incline[incline-1]);
        }
      }
    }
  }

  return board;
}



const grass = 'grass'
const gl_hexes = [
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1","water:1"], grass],
  [0, [], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["woods:1:20","ground_fluff:3:1","foliage_elev:2"], grass],
  [0, ["ground_fluff:1:1","water:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:2"], grass],
  [0, ["woods:1:20","foliage_elev:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:1:1","water:1"], grass],
  [0, ["ground_fluff:1:1","water:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:3:2"], grass],
  [0, ["woods:1:20","ground_fluff:1:1","foliage_elev:2"], grass],
  [0, ["woods:2:20","foliage_elev:2"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["rough:1:20"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1","water:1"], grass],
  [0, ["ground_fluff:1:1","water:1"], grass],
  [0, ["ground_fluff:1:1","water:1"], grass],
  [1, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1","rough:1:20"], grass],
  [0, ["ground_fluff:1:3"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [1, ["ground_fluff:1:1"], grass],
  [1, ["ground_fluff:1:2"], grass],
  [1, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1","rough:1:20"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["water:1"], grass],
  [2, [], grass],
  [2, [], grass],
  [1, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:4"], grass],
  [0, ["ground_fluff:1:4"], grass],
  [1, ["ground_fluff:1:1"], grass],
  [1, ["woods:1:20","ground_fluff:1:1","foliage_elev:2"], grass],
  [2, [], grass],
  [1, ["ground_fluff:1:2"], grass],
  [1, ["ground_fluff:1:3"], grass],
  [0, ["ground_fluff:1:3"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["water:1"], grass],
  [0, ["ground_fluff:1:1","water:1"], grass],
  [2, [], grass],
  [1, [], grass],
  [0, ["ground_fluff:1:4","rough:1:20"], grass],
  [0, ["ground_fluff:1:4"], grass],
  [1, [], grass],
  [2, [], grass],
  [3, [], grass],
  [2, ["woods:1:20","foliage_elev:2"], grass],
  [1, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["road:1:18","ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:3"], grass],
  [0, ["ground_fluff:1:3","water:1"], grass],
  [0, ["ground_fluff:1:3","water:1"], grass],
  [0, ["ground_fluff:1:4"], grass],
  [0, ["ground_fluff:1:4"], grass],
  [1, [], grass],
  [0, ["road:1:20","ground_fluff:1:2"], grass],
  [2, [], grass],
  [1, [], grass],
  [1, ["ground_fluff:1:1"], grass],
  [0, ["road:1:18","ground_fluff:1:1"], grass],
  [0, ["road:1:18","ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:3","rough:1:20"], grass],
  [0, ["ground_fluff:1:4"], grass],
  [0, ["ground_fluff:1:3"], grass],
  [0, ["ground_fluff:1:3"], grass],
  [0, ["ground_fluff:1:3","water:1"], grass],
  [0, ["bridge:3:18","bridge_cf:90","bridge_elev:1","ground_fluff:1:3"], grass],
  [0, ["bridge:3:18","bridge_cf:90","bridge_elev:1","ground_fluff:1:3"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["road:1:36"], grass],
  [0, ["road:1:34"], grass],
  [0, ["road:1:18"], grass],
  [1, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["woods:1:20","ground_fluff:1:1","foliage_elev:2"], grass],
  [0, ["ground_fluff:1:3"], grass],
  [0, ["ground_fluff:1:4"], grass],
  [0, ["ground_fluff:1:4"], grass],
  [0, ["bridge:3:18","bridge_cf:90","bridge_elev:1","ground_fluff:1:2"], grass],
  [0, ["water:1","bridge:3:18","bridge_cf:90","bridge_elev:1","ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [2, [], grass],
  [1, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["woods:1:20","foliage_elev:2"], grass],
  [0, ["road:1:18","ground_fluff:1:3"], grass],
  [0, ["bridge:3:18","bridge_cf:90","bridge_elev:1","ground_fluff:1:3"], grass],
  [2, [], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["woods:1:20","ground_fluff:1:2","foliage_elev:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["rough:1:20"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["road:1:10","ground_fluff:1:1"], grass],
  [2, [], grass],
  [3, [], grass],
  [3, [], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["road:1:9","ground_fluff:1:1"], grass],
  [2, [], grass],
  [2, [], grass],
  [2, [], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["woods:1:20","foliage_elev:2"], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["road:1:18"], grass],
  [0, ["road:1:17"], grass],
  [1, ["ground_fluff:1:1"], grass],
  [2, [], grass],
  [1, ["ground_fluff:1:1"], grass],
  [1, [], grass],
  [1, [], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, [], grass],
  [0, ["woods:2:20","foliage_elev:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["road:1:18"], grass],
  [0, [], grass],
  [0, ["rough:1:20"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [1, ["ground_fluff:1:1"], grass],
  [1, [], grass],
  [0, ["woods:1:20","foliage_elev:2"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, ["woods:1:20","foliage_elev:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["rough:1:20"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:2","water:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1","rough:1:20"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:2"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, ["ground_fluff:3:1"], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, [], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, ["ground_fluff:1:1"], grass],
  [0, [], grass],
]
