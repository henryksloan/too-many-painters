import './Game.css';

import * as workerTimers from 'worker-timers';

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import Canvas from './Canvas';

const Game = props => {
  let { roomId } = useParams();
  let canvasRef = useRef();
  let [drawTimer, setDrawTimer] = useState(0);
  let [guess, setGuess] = useState('');

  async function roundCountdown() {
    for (let i = 3; i > 0; i--) {
      if (!canvasRef.current) return;
      canvasRef.current.clearScreen('#EEEEEE');
      canvasRef.current.drawNumber(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (canvasRef.current) canvasRef.current.clearScreen();
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && event.target.value.length > 0) {
      props.socket.emit('guess', event.target.value);
      setGuess('');
    }
  }
  const handleChange = (event) => setGuess(event.target.value);

  const playerString = (player) => {
    const playerArr = props.players.find(arr => arr[0] === player) || ['', ''];
    return `${playerArr[1]}${(player === props.selfId) ? ' (You)' : ''}`;
  }

  useEffect(() => {
    props.socket.on('round_started', data => {
      setGuess('');
      roundCountdown();
    });

    props.socket.on('start_draw', data => {
      let { inkAmount, color } = data;
      canvasRef.current.setInk(inkAmount, color);
      setDrawTimer(5);
    });

    props.socket.emit('game_loaded');
  }, [props.socket, roomId]);

  useEffect(() => {
    if (drawTimer <= 0) return;
    const interval = workerTimers.setInterval(() => setDrawTimer(timer => timer - 1), 1000);
    return () => { workerTimers.clearInterval(interval) };
  }, [drawTimer])


  const painterList = props.paintOrder.map((player) => {
    if (player === props.painter) {
      return <li key={ player }><strong>{ playerString(player) }</strong></li>
    } else {
      return <li key={ player }>{ playerString(player) }</li>
    }
  });

  const chat = props.chat.map((message, index) => {
    if (message.roundStart) {
      return <small key={index}>Round start: { playerString(message.guesser.slice()) }</small>
    } else {
      return  (
        <p key={index} className={message.correct ? 'correct-guess' : ''}>
          {playerString(message.sender)}: {message.content}
        </p>);
    }
  });

  return (
    <div className="game">
      <div className="round-area box">
        <h3>Round x of y</h3>
        <h2>{ props.word }</h2>
        <span></span>
      </div>
      <div className="game-area">
        <div className="painter-list box">
          <div className="painter-header box-header">
            <h2>Painters</h2>
          </div>
          <ol>{ painterList }</ol>
        </div>
        <Canvas ref={ canvasRef } socket={ props.socket }
          drawTimer={ drawTimer} myTurn={ props.myTurn } />
        <div className="guesser-area box">
          <div className="guesser-name box-header">
            <strong>Guesser</strong>
            <p>{ playerString(props.guesser) }</p>
          </div>
          <div className="chat-area">{ chat }</div>
          <input type="text" value={ guess }
            onChange={ handleChange } onKeyDown={ handleKeyDown }
            placeholder={props.myTurnGuess ? "Write your guess here" : ""}
            disabled={!props.myTurnGuess}></input>
        </div>
      </div>
    </div>
  );
}

export default Game;