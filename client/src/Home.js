import './Home.css';

import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

const Lobby = props => {
  const history = useHistory();
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  useEffect(() => {
    props.socket.on("room_created", (id) => {
      history.push(`/room/${id}`);
    });

    return () => { props.socket.removeAllListeners() };
  }, [history, props.socket]);

  function onUsernameChange(e) {
    setUsername(e.target.value);
    localStorage.setItem('username', e.target.value);
  }
  
  return (
    <div className="home">
      <div className="home-panel box">
        <input type="text" placeholder="Username" className="username-input"
          value={ username } onChange={ onUsernameChange } maxlength="13"></input>
        <button className="create-room-button"
          onClick={() => props.socket.emit('create_room') }>Create Room</button>
      </div>
      <div className="home-panel box">
        <h2>How to play</h2>
        <ul>
          <li>At the beginning of a game, players are randomly placed in a hidden guesser order</li>
          <li>Each round, the next person in the order becomes the guesser, and everyone else becomes a painter</li>
          <li>In a random order, each painter gets a short timer and a small amount of ink of a random color</li>
          <li>The painters must work together to draw their word, while the guesser tries to figure it out</li>
        </ul>
      </div>
    </div>
  );
}

export default Lobby;