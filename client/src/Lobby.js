const Lobby = props => {
  const userList = props.players.map(player => (player[0] === props.selfId)
    ? <li key={ player[0] }><strong>{player[1]} (You)</strong></li>
    : <li key={ player[0] }>{player[1]}</li>);

  return (
    <div>
      <button onClick={ () => props.socket.emit('start_room') }>Start</button>
      <ol>{ userList }</ol>
    </div>
  );
}

export default Lobby;