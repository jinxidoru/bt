
// ---- types
export type Mech = ReturnType<typeof Mimir.new_mech>
export type Facing = 0 | 1 | 2 | 3 | 4 | 5;
export type SpeedMode = 0 | 1 | 2;   // walk, run, jump


// ---- actions
export type MiAction = MiAction_Init | MiAction_Move;

export interface MiAction_Init {
  type: "init";
  mechs: Mech[];
};

export interface MiAction_Move {
  type: "move"
  mech_id: number
  path: [number,Facing][]
  speed: SpeedMode
}



// ---- local types
interface MiRevert {
  mechs?: Mech[]
  overview?: Overview
}

interface Overview {
  phase: "pregame" | "move";
  turn: number;
  initiative: number[];
  team_first: number;
  team_current: number;
}


export class Mimir {

  // --- state
  actions: {action:MiAction, revert:MiRevert}[] = []
  mechs: Mech[] = [];
  overview: Overview = {
    phase: "pregame",
    turn: 0,
    initiative: [],
    team_first: 0,
    team_current: 0,
  }


  // --- private
  private listeners = new Set();
  private reverted: MiAction[] = []


  // ---- methods
  on_action(listener:any) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); }
  }

  push(action:MiAction) {
    this.actions.push({action,revert:{}});
    if (action !== this.reverted.at(-1)) {
      this.reverted = []
    }

    // action: init
    if (action.type === 'init') {
      const mechs = this.snap_mechs();
      mechs.push(...action.mechs);
      mechs.forEach((m,n) => { m.id = n; });

      // start the game
      if (this.overview.phase === 'pregame') {
        this.start_round();
      }

    // action: move
    } else if (action.type === 'move') {
      const mech = this.snap_mech(action.mech_id);
      mech.move_speed = action.speed;
      mech.moved = true;

      // apply the movement
      mech.move_dist = 0;
      for (let [h,f] of action.path) {
        if (mech.hex !== h)  mech.move_dist++;
        mech.hex = h;
        mech.facing = f;
      }

      // heat
      if (action.speed <= 1) {
        mech.heat_new += (action.speed+1);
      } else if (action.speed === 2) {
        mech.heat_new += Math.max(3, mech.move_dist);
      }

      // check for the end of the move phase
      if (!this.mechs.find(m => !m.moved)) {
        this.end_of_round();
      }

    // invalid
    } else {
      console.error(`rejecting invalid action: ${action}`)
      this.actions.pop();
      return false;
    }

    this.notify();
    return true;
  }

  revert() {
    const item = this.actions.pop();
    if (item) {
      const revert = item.revert;
      if (revert.mechs)  this.mechs = revert.mechs;
      if (revert.overview)  this.overview = revert.overview;
    }
    this.notify();
    this.reverted.push(item.action);
  }

  replay() {
    const action = this.reverted.at(-1);
    if (action) {
      this.push(action);
      this.reverted.pop();
      return true;
    } else {
      return false;
    }
  }

  roll_2d6() {
    const r1 = Math.ceil(Math.random()*6);
    const r2 = Math.ceil(Math.random()*6);
    return (r1+r2);
  }


  // ---- private methods
  private start_round() {
    const oview = this.snap_overview();
    oview.phase = 'move';
    oview.turn++;

    // roll initiative
    do {
      var [r0,r1] = oview.initiative = [this.roll_2d6(), this.roll_2d6()];
    } while (r0 === r1);
    oview.team_first = (r0 > r1) ? 0 : 1;
    oview.team_current = oview.team_first;
  }

  private end_of_round() {
    let mechs = this.snap_mechs();
    for (var i=0; i<mechs.length; i++) {
      let mech = mechs[i] = {...mechs[i]};
      mech.moved = false;
      mech.move_dist = 0;
      mech.heat_new = 0;
    }
    this.start_round();
  }

  private get_revert() {
    return this.actions.at(-1)?.revert || {}
  }

  private snap_mechs() {
    const revert = this.get_revert();
    if (!revert.mechs) {
      revert.mechs = this.mechs;
      this.mechs = [...this.mechs];
    }
    return this.mechs;
  }

  private snap_overview() {
    const revert = this.get_revert();
    if (!revert.overview) {
      revert.overview = this.overview;
      this.overview = {...this.overview};
    }
    return this.overview;
  }

  private snap_mech(mech_id:number) {
    const mechs = this.snap_mechs();
    const prev = mechs[mech_id];
    return mechs[mech_id] = {...prev};
  }

  private notify() {
    this.listeners.forEach((l:any) => l());
  }


  // ---- static methods
  static new_mech(hex:number, name:string, team:number) {
    return {
      id: -1,
      facing: 1 as Facing,
      mps_walk: 6,
      mps_run: 9,
      hex, team, name,

      // movement
      moved: false,
      move_speed: 0 as SpeedMode,
      move_dist: 0,

      // heat
      heat: 0,
      heat_new: 0,
    }
  }

}

