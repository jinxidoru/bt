import {useState,useEffect} from 'react'
import React from 'react'
import "./main.scss"
import {Board} from './board'
import {GameState} from './game'
import {BtCanvas} from './canvas'

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



const BtSidebar : React.FC<{game:GameState}> = ({game}) => {
  return (<div className="bt-sidebar">Hello</div>)
};



