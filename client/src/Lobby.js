import './Lobby.css';

import React, { useEffect, useState } from "react";

const Lobby = props => {
  const [nRounds, setNRounds] = useState(10);

  const [customRounds, setCustomRounds] = useState(false);
  const [drawTime, setDrawTime] = useState(10);
  const [minimumInk, setMinimumInk] = useState(35);
  const [maximumInk, setMaximumInk] = useState(100);

  useEffect(() => {
    const settingChanged = (name, value) => {
      if (name === 'nRounds') setNRounds(value);
      else if (name === 'customRounds') setCustomRounds(value);
      else if (name === 'drawTime') setDrawTime(value);
      else if (name === 'minimumInk') setMinimumInk(value);
      else if (name === 'maximumInk') setMaximumInk(value);
    }

    props.socket.on('setting_changed', settingChanged);

    return () => {
      props.socket.off('setting_changed', settingChanged);
    };
  }, [props.players, props.selfId, props.socket]);

  function changeUsername() {
    const username = prompt("Choose your new username");
    if (username) {
      localStorage.setItem('username', username);
      props.socket.emit('change_username', username);
    }
  }

  function changeNumber(e, setStateFunc, settingName) {
    let { value, min, max } = e.target;
    if (value !== '') value = Math.max(Number(min), Math.min(Number(max), Number(value)));
    setStateFunc(value);
    props.socket.emit('change_setting', settingName, value);
  }

  function changeCustomRounds(e) {
    setCustomRounds(e.target.checked);
    props.socket.emit('change_setting', 'customRounds', e.target.checked);
  }

  const isLeader = props.players[0] && props.players[0][0] === props.selfId;
  function handleSubmit(e) {
    e.preventDefault();
    if (isLeader) props.socket.emit('start_room', { nRounds, customRounds, drawTime, minimumInk, maximumInk });
  }

  function onKeyPress(e) {
    if (e.target.type !== 'textarea' && e.which === 13 /* Enter */) {
      e.preventDefault();
    }
  }

  const userList = props.players.map(player => (player[0] === props.selfId)
    ? <li key={ player[0] }><strong>{player[1]} (You)</strong></li>
    : <li key={ player[0] }>{player[1]}</li>);

  const customRoundSettings = (
    <div className="custom-round-settings">
      <div className="setting">
        <label htmlFor="draw-time">Draw time in seconds</label>
        <input type="number" name="draw-time" id="draw-time" value={ drawTime }
          onChange={ (e) => changeNumber(e, setDrawTime, 'drawTime') }
          min="1" max="60" required disabled={ !isLeader }></input>
      </div>

      <div className="setting">
        <label htmlFor="minimum-ink">Minimum ink</label>
        <input type="number" name="minimum-ink" id="minimum-ink" value={ minimumInk }
          onChange={ (e) => changeNumber(e, setMinimumInk, 'minimumInk') }
          min="0" max="100" required disabled={ !isLeader }></input>
      </div>

      <div className="setting">
        <label htmlFor="maximum-ink">Maximum ink</label>
        <input type="number" name="maximum-ink" id="maximum-ink" value={ maximumInk }
          onChange={ (e) => changeNumber(e, setMaximumInk, 'maximumInk') }
          min="0" max="100" required disabled={ !isLeader }></input>
      </div>
    </div>
  );

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
              <input type="number" name="rounds" id="rounds" value={ nRounds }
                onChange={ (e) => changeNumber(e, setNRounds, 'nRounds') }
                min="1" max="30" required disabled={ !isLeader }></input>
            </div>

            <div className="setting">
              <label htmlFor="custom-words">Custom words</label>
              <textarea name="custom-words" id="custom-words" rows="6"
                placeholder="Type a list of custom words here, separated by commas" disabled={ !isLeader }></textarea>
            </div>

            <div className="custom-rounds-area">
              <div className="setting">
                <label htmlFor="custom-rounds">Custom rounds</label>
                <input type="checkbox" name="custom-rounds" id="custom-rounds"
                  onChange={ changeCustomRounds } checked={ customRounds }
                  disabled={ !isLeader }></input>
              </div>

              { customRounds && customRoundSettings }
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