import './Room.css';

import * as workerTimers from 'worker-timers';

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import Canvas from './Canvas';

const Room = props => {
  let { roomId } = useParams();
  let canvasRef = useRef();
  let [users, setUsers] = useState([]);
  let [painter, setPainter] = useState(null);
  let [paintOrder, setPaintOrder] = useState([]);
  let [guesser, setGuesser] = useState(null);
  let [myTurn, setMyTurn] = useState(false);
  let [drawTimer, setDrawTimer] = useState(0);

  async function roundCountdown() {
    for (let i = 3; i > 0; i--) {
      if (!canvasRef.current) return;
      canvasRef.current.clearScreen('#EEEEEE');
      canvasRef.current.drawNumber(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (canvasRef.current) canvasRef.current.clearScreen();
  }

  useEffect(() => {
    props.socket.on("players_changed", (room) => {
      setUsers(room.users);
    });

    props.socket.on("initialize", (room) => {
      setUsers(room.users);
      setPainter(room.painter);
      setGuesser(room.guesser);
    });

    props.socket.on('round_started', data => {
      setGuesser(data.guesser);
      setPainter(null);
      setPaintOrder(data.paintOrder);
      setMyTurn(false);
      roundCountdown();
    });

    props.socket.on('start_draw', data => {
      let {painter: _painter, inkAmount, color} = data;
      setPainter(_painter);
      canvasRef.current.setInk(inkAmount, color);
      setMyTurn(false);
      setDrawTimer(5);
    });

    props.socket.on('your_turn', () => {
      setMyTurn(true);
    });

    props.socket.emit('join_room', roomId);
    props.socket.emit('initialize');

    return () => {
      props.socket.emit('leave_room');
      props.socket.removeAllListeners();
    };
  }, [props.socket, roomId]);

  useEffect(() => {
    if (drawTimer <= 0) return;
    const interval = workerTimers.setInterval(() => setDrawTimer(timer => timer - 1), 1000);
    return () => { workerTimers.clearInterval(interval) };
  }, [drawTimer])


  const painterList = paintOrder.map((user) => {
    if (user === painter) {
      return <li key={ user }><strong>{ user }</strong></li>
    } else {
      return <li key={ user }>{ user }</li>
    }
  });
  const userList = users.map((user) => {
    if (user === painter) {
      return <li key={ user }><strong>{ user }</strong></li>
    } else if (user === guesser) {
      return <li key={ user }><i>{ user }</i></li>
    } else {
      return <li key={ user }>{ user }</li>
    }
  });

  return (
    <div className="room">
      <div className="game-area">
        <div className="painter-list box">
          Round x of y:<br />
          <ol>{ painterList }</ol>
        </div>
        <Canvas ref={ canvasRef } socket={ props.socket }
          drawTimer={ drawTimer} myTurn={ myTurn } />
        <div className="guesser-area box">
          Guesser:<br />
          <strong>{ guesser }</strong>
        </div>
      </div>
      <ol>{ userList }</ol>
    </div>
  );
}

export default Room;