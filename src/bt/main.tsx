import {useState,useEffect} from 'react'
import React from 'react'
import "./main.scss"
import {Board} from './board'
import {GameState,Mech} from './game'
import {BtCanvas} from './canvas'


type FC<T> = React.FC<T>

export function BtMain() {
  const [game,setGame] = useState<GameState|null>(null);

  useEffect(() => {
    Board.load('grasslands_2').then(board => {
      const game = new GameState();
      game.set_board(board);
      setGame(game);
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
  return (<div className="bt-sidebar">
    <BtControls />
    <div className="mech-list">
      {game.mechs.map((mech,k) => (<BtMechCard key={k} mech={mech} />))}
    </div>
  </div>)
};


const BtMechCard : FC<{mech:Mech}> = ({mech}) => {
  return (<div className={`mech-card team${mech.team}`}>
    <div className="heat" />
    <div className="paperdoll" />
    <div className="name">{mech.name}</div>
    <div className="info">
      Walk: <b>{mech.mps_walk}</b>&nbsp;&nbsp;
      Run: <b>{mech.mps_run}</b>
    </div>
  </div>)
};


const BtControls : FC<{}> = () => {
  return (<div className="bt-controls">
    Phase: Movement<br/>
    Select a mech to move
  </div>);
};

