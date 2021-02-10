import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
} from "react-router-dom";

import './App.css';
import logo from './assets/logo.png';
import Lobby from './Lobby';
import Room from './Room';
import Home from './Home';

import socketIOClient from "socket.io-client";
const ENDPOINT = '/';
const socket = socketIOClient(ENDPOINT);

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <Link to="/"><img src={logo} alt="Too Many Painters" /></Link>
        </header>

        <Switch>
          <Route path='/room/:roomId'>
            <Room socket={ socket } />
          </Route>
          <Route path='/lobby/:roomId'>
            <Lobby socket={ socket } />
          </Route>
          <Route path='/'>
            <Home socket={ socket } />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
