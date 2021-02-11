import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";

import Game from './Game';
import Lobby from './Lobby';

const Room = props => {
  let { roomId } = useParams();
  let [started, setStarted] = useState(false);
  let [players, setPlayers] = useState([]);
  let [painter, setPainter] = useState(null);
  let [paintOrder, setPaintOrder] = useState([]);
  let [guesser, setGuesser] = useState(null);
  let [myTurn, setMyTurn] = useState(false);
  let [word, setWord] = useState('');

  useEffect(() => {
    // TODO: Catch exceptions and probably show some other page
    props.socket.emit('join_room', roomId);

    props.socket.on('room_joined', data => {
      console.log(data);
      setStarted(data.started);
      setPlayers(data.players);
      setPainter(data.painter);
      setPaintOrder(data.paintOrder);
      setGuesser(data.guesser);
    });

    props.socket.on('room_started', () => {
      setStarted(true);
    });

    props.socket.on('players_changed', setPlayers);

    props.socket.on('round_started', data => {
      setGuesser(data.guesser);
      setPainter(null);
      setPaintOrder(data.paintOrder);
      setMyTurn(false);
      setWord(data.word);
    });

    props.socket.on('start_draw', data => {
      let { painter: _painter } = data;
      setPainter(_painter);
      setMyTurn(false);
    });

    props.socket.on('your_turn', () => {
      setMyTurn(true);
    });

    return () => {
      props.socket.emit('leave_room');
      props.socket.removeAllListeners();
    };
  }, [props.socket, roomId]);

  return (
    <div className="room">
      {
        started
        ? <Game socket={props.socket} players={players} myTurn={myTurn}
          paintOrder={paintOrder} painter={painter} guesser={guesser} word={word} />
        : <Lobby socket={props.socket} players={players} />
      }
    </div>
  );
}

export default Room;