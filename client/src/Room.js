import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";

import Game from './Game';
import Lobby from './Lobby';

const Room = props => {
  let { roomId } = useParams();
  let [started, setStarted] = useState(false);

  let [players, setPlayers] = useState([]);
  let [selfId, setSelfId] = useState(null);

  let [painter, setPainter] = useState(null);
  let [paintOrder, setPaintOrder] = useState([]);

  let [guesser, setGuesser] = useState(null);
  let [myTurn, setMyTurn] = useState(false);
  let [myTurnGuess, setMyTurnGuess] = useState(false);

  let [word, setWord] = useState('');

  let [round, setRound] = useState(1);
  let [nRounds, setNRounds] = useState(0);
  let [drawTime, setDrawTime] = useState(0);

  useEffect(() => {
    // TODO: Catch exceptions and probably show some other page
    props.socket.emit('join_room', roomId, localStorage.getItem('username'));

    props.socket.on('room_joined', data => {
      console.log(data);
      setStarted(data.started);
      setPlayers(data.players);
      setSelfId(data.selfId);
      setPainter(data.painter);
      setPaintOrder(data.paintOrder);
      setGuesser(data.guesser);
      setRound(data.round);
      setNRounds(data.nRounds);
      setDrawTime(data.drawTime);
    });

    props.socket.on('room_started', settings => {
      setNRounds(settings.nRounds);
      setDrawTime(settings.drawTime);
      setStarted(true);
    });

    props.socket.on('game_ended', () => {
      setStarted(false);
    });

    props.socket.on('players_changed', data => {
      setPlayers(data);
      setPaintOrder(list => list.filter(item => data.some(new_player => new_player[0] === item)));
    });

    props.socket.on('round_started', data => {
      setGuesser(data.guesser);
      setPainter(null);
      setPaintOrder(data.paintOrder);
      setMyTurn(false);
      setMyTurnGuess(false);
      setWord(data.word);
      setRound(data.round);
    });

    props.socket.on('start_draw', data => {
      let { painter: _painter } = data;
      setPainter(_painter);
      setMyTurn(false);
    });

    props.socket.on('your_turn', () => setMyTurn(true));
    props.socket.on('your_turn_guess', () => setMyTurnGuess(true));

    return () => {
      props.socket.emit('leave_room');
      props.socket.removeAllListeners();
    };
  }, [props.socket, roomId]);

  return (
    <div className="room">
      {
        started
        ? <Game socket={props.socket} players={players} selfId={selfId}
            myTurn={myTurn} myTurnGuess={myTurnGuess}
            paintOrder={paintOrder} painter={painter}
            guesser={guesser} word={word}
            round={round} nRounds={nRounds} drawTime={drawTime} />
        : <Lobby socket={props.socket} players={players} selfId={selfId} />
      }
    </div>
  );
}

export default Room;