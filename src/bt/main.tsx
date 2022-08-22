import {useState,useEffect} from 'react'
import React from 'react'
import "./main.scss"
import {Board} from './board'
import {GameState,Mech} from './game'
import {BtCanvas} from './canvas'
import {Provider,useDispatch} from 'react-redux'
import {store,useSelector, ACTION} from './store'


type FC<T> = React.FC<T>


export function App() {
  return (
    <Provider store={store}>
      <BtMain />
    </Provider>
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
  const dispatch = useDispatch();

  const onClick = () => dispatch(ACTION.move_select(mech.id));

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
  const move = useSelector(state => state.game.move);
  const is_staged = useSelector(state => state.game.move.staged.length > 0);
  const dispatch = useDispatch();

  function submit() {
    if (is_staged) {
      dispatch(ACTION.move_select(-1));
    }
  }

  return (<div className="bt-controls">
    Phase: Movement<br/>
    {(move.selected_mech === -1) ? ("Select a mech to move") : (<>
      <button onClick={() => dispatch(ACTION.move_speed('walk'))}>Walk</button>
      <button onClick={() => dispatch(ACTION.move_speed('run'))}>Run</button>
      {is_staged && (<button onClick={submit}>Commit</button>)}
    </>)}
  </div>);
};

