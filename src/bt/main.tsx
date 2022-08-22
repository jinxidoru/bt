import {useState,useEffect,useContext} from 'react'
import React from 'react'
import "./main.scss"
import {Board} from './board'
import {GameState,Mech} from './game'
import {BtCanvas} from './canvas'
import {ContextProp,createContext} from './react-utils'


type FC<T> = React.FC<T>
type Phase = 'move' | 'attack';
type Speed = 'walk' | 'run';



export const GlobalContext = createContext<{
  phase: ContextProp<Phase>;
  curMech: ContextProp<Mech|null>;
  speed: ContextProp<Speed>;
}>();


export function App() {
  const phase = useState<Phase>('move');
  const curMech = useState<Mech|null>(null);
  const speed = useState<Speed>('walk');

  return (
    <GlobalContext.Provider value={{phase,curMech,speed}}>
      <BtMain />
    </GlobalContext.Provider>
  )
}


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
  const [curMech,setCurMech] = useContext(GlobalContext).curMech;

  const onClick = () => {
    setCurMech( (curMech === mech) ? null : mech );
  }

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


const BtControls : FC<{}> = () => {
  const {curMech:[curMech], speed:[,setSpeed]} = useContext(GlobalContext);

  return (<div className="bt-controls">
    Phase: Movement<br/>
    {!curMech ? ("Select a mech to move") : (<>
      <button onClick={() => setSpeed('walk')}>Walk</button>
      <button onClick={() => setSpeed('run')}>Run</button>
    </>)}
  </div>);
};

