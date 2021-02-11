const Lobby = props => {
  const userList = props.players.map(player => <li key={ player[0] }>{player[1]} ({ player[0] })</li>);

  return (
    <div>
      <button onClick={ () => props.socket.emit('start_room') }>Start</button>
      <ol>{ userList }</ol>
    </div>
  );
}

export default Lobby;