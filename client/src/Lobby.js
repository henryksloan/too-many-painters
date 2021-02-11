import './Lobby.css';

const Lobby = props => {
  const userList = props.players.map(player => (player[0] === props.selfId)
    ? <li key={ player[0] }><strong>{player[1]} (You)</strong></li>
    : <li key={ player[0] }>{player[1]}</li>);

  return (
    <div className="lobby">
        <div className="lobby-user-list box">
          <div className="box-header">
            <h2>Players</h2>
          </div>
          <ul>{ userList }</ul>
          <div className="name-button-area box-footer">
            <button>Change username</button>
          </div>
        </div>
        <div className="lobby-game-settings box">
          <div className="box-header">
            <h2>Settings</h2>
          </div>
          <div className="game-settings-area">
          </div>
          <div className="start-button-area">
            <button onClick={ () => props.socket.emit('start_room') }>Start</button>
          </div>
        </div>
    </div>
  );
}

export default Lobby;