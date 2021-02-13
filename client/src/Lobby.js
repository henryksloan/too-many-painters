import './Lobby.css';

import React, { useState } from "react";

const Lobby = props => {
  const [rounds, setRounds] = useState(10);
  const [drawTime, setDrawTime] = useState(5);

  function changeUsername() {
    const username = prompt("Choose your new username");
    if (username) {
      localStorage.setItem('username', username);
      props.socket.emit('change_username', username);
    }
  }

  function changeRounds(e) {
    if (e.target.value === '') {
      setRounds('');
      return;
    }
    let { value, min, max } = e.target;
    value = Math.max(Number(min), Math.min(Number(max), Number(value)));
    setRounds(value);
  }

  function changeDrawTime(e) {
    if (e.target.value === '') {
      setDrawTime('');
      return;
    }
    let { value, min, max } = e.target;
    value = Math.max(Number(min), Math.min(Number(max), Number(value)));
    setDrawTime(value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    alert("Bla");
    // onClick={ () => props.socket.emit('start_room') }
  }

  function onKeyPress(e) {
    if (e.target.type !== 'textarea' && e.which === 13 /* Enter */) {
      e.preventDefault();
    }
  }

  const userList = props.players.map(player => (player[0] === props.selfId)
    ? <li key={ player[0] }><strong>{player[1]} (You)</strong></li>
    : <li key={ player[0] }>{player[1]}</li>);
  const isLeader = props.players[0] && props.players[0][0] === props.selfId;

  return (
    <div className="lobby">
      <div className="lobby-user-list box">
        <div className="box-header">
          <h2>Players</h2>
        </div>
        <ul>{ userList }</ul>
        <div className="name-button-area box-footer">
          <button onClick={ changeUsername }>
            Change Username
          </button>
        </div>
      </div>
      <form className="lobby-game-settings box" onSubmit={ handleSubmit } onKeyPress={ onKeyPress }>
        <div className="box-header">
          <h2>Settings</h2>
        </div>
        <div className="game-settings-area">
          <div className="settings-wrapper">
            <div className="setting">
              <label htmlFor="rounds">Number of rounds</label>
              <input type="number" name="rounds" id="rounds"
                onChange={ changeRounds } value={ rounds }
                min="1" max="30" required disabled={ !isLeader }></input>
            </div>

            <div className="setting">
              <label htmlFor="draw-time">Draw time in seconds</label>
              <input type="number" name="draw-time" id="draw-time"
                onChange={ changeDrawTime } value={ drawTime }
                min="1" max="60" required disabled={ !isLeader }></input>
            </div>

            <div className="setting">
              <label htmlFor="custom-words">Custom words</label>
              <textarea name="custom-words" id="custom-words" rows="6"
                placeholder="Type a list of custom words here, separated by commas" disabled={ !isLeader }></textarea>
            </div>
          </div>
        </div>
        <div className="start-button-area">
          <input type="submit" value="Start" disabled={ !isLeader }></input>
        </div>
      </form>
    </div>
  );
}

export default Lobby;