import {useState,useEffect} from 'react'
import React from 'react'
import "./main.scss"
import {Board} from './board'
import {GameState,Mech,new_mech} from './game'
import {BtCanvas} from './canvas'
import {useDirty} from './react-utils'


type FC<T> = React.FC<T>


export function App() {
  return (
    <BtMain />
  )
}


export function BtMain() {
  const [game,setGame] = useState<GameState|null>(null);

  useEffect(() => {
    Board.load('grasslands_2').then(board => {
      const game = new GameState();
      game.set_board(board);
      setGame(game);

      game.set_mechs([
        new_mech(88,'Daimyo',0),
        new_mech(56,'Wolverine',0),
        new_mech(121,'ZeusX_X3',1),
        new_mech(134,'jabberwocky_65a',1),
        new_mech(38,'jabberwocky_65a',0),
      ]);

    });
  }, []);

  if (game) {
    return (<div className="bt-root">
      <BtCanvas game={game} />
      <BtSidebar game={game} />
    </div>);
  } else {
    return (<div className="bt-root">Loading...</div>);
  }
}



const BtSidebar : FC<{game:GameState}> = ({game}) => {
  useDirty(game);

  return (<div className="bt-sidebar">
    <BtControls game={game} />
    <div className="mech-list">
      {game.mechs.map(mech => (<BtMechCard key={mech.id} mech={mech} game={game} />))}
    </div>
  </div>)
};


const BtMechCard : FC<{mech:Mech,game:GameState}> = ({mech,game}) => {
  const onClick = () => game.move_select(mech.id);

  return (<div className={`mech-card team${mech.team}`} onClick={onClick}>
    <div className="heat" />
    <div className="paperdoll" />
    <div className="name">{mech.name}</div>
    <div className="info">
      Walk: <b>{mech.mps_walk}</b>&nbsp;&nbsp;
      Run: <b>{mech.mps_run}</b>
    </div>
  </div>)
};


const BtControls : FC<{game:GameState}> = ({game}) => {
  useDirty(game);
  const is_staged = game.move.staged.length > 0;

  function submit() {
    if (is_staged) {
      game.move_commit();
    }
  }

  return (<div className="bt-controls">
    Phase: Movement<br/>
    {(game.move.selected_mech === -1) ? ("Select a mech to move") : (<>
      <button onClick={() => game.move_speed('walk')}>Walk</button>
      <button onClick={() => game.move_speed('run')}>Run</button>
      {is_staged && (<button onClick={submit}>Commit</button>)}
    </>)}
  </div>);
};

