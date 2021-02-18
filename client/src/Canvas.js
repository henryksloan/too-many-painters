import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react'

import * as workerTimers from 'worker-timers';

function drawLine(context, coords, color) {
  if (color) context.strokeStyle = color;
  // TODO: Only partially draw lines that would exceed inkAmount
  context.beginPath();
  context.moveTo(coords[0], coords[1]);
  context.lineTo(coords[2], coords[3]);
  context.stroke();
  context.closePath();
};

function useCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#FFFFFF';
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = 'red';
    context.lineWidth = 5;
    context.lineCap = 'round'; 
  }, []);

  return canvasRef;
}

const Canvas = forwardRef((props, ref) => {
  const canvasRef = useCanvas();
  let [inkAmount, setInkAmount] = useState(0);
  let [inkColor, setInkColor] = useState("");
  let [penDown, setPenDown] = useState(false);
  let [x1, setX1] = useState(0);
  let [y1, setY1] = useState(0);

  useImperativeHandle(ref, () => ({
    setInk(inkAmount, color) {
      setInkAmount(inkAmount);
      setInkColor(color);
      canvasRef.current.getContext('2d').strokeStyle = color;
    },

    clearScreen(color) {
      const context = canvasRef.current.getContext('2d');
      context.fillStyle = color || '#FFFFFF';
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    },

    drawNumber(number) {
      // https://stackoverflow.com/a/29912925/7401492
      let ctx = canvasRef.current.getContext('2d'),
          dashLen = 220, dashOffset = dashLen, speed = 9,
          txt = number.toString(), i = 0;
      let oldStrokeStyle = ctx.strokeStyle.slice();
      let x = ctx.canvas.width / 2, y = ctx.canvas.height / 2;
      ctx.font = "50px Comic Sans MS, cursive, TSCu_Comic, sans-serif"; 
      
      (function loop() {
        ctx.fillRect(x, y - 90, 60, 150);
        ctx.setLineDash([dashLen - dashOffset, dashOffset - speed]);
        dashOffset -= speed;
        ctx.strokeStyle = "#1f2f90";
        ctx.strokeText(txt[i], x, y);
        ctx.strokeStyle = oldStrokeStyle;
        if (dashOffset > 0) workerTimers.setTimeout(loop, 16);
      })();
      ctx.fillRect(x, y - 90, 60, 150);
    },

    showScore(txt) {
      let ctx = document.querySelector("canvas").getContext("2d");
      let old_fill = ctx.fillStyle;
      ctx.fillStyle = "#EEEEEE7F";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = old_fill;
      ctx.strokeStyle = "#1f2f90";

      ctx.font = "35px Comic Sans MS, cursive, TSCu_Comic, sans-serif"; 
      let word_label = "The word was:";
      let word_label_x = (ctx.canvas.width / 2) - Math.floor(
        (ctx.measureText(word_label).width) / 2);
      ctx.fillStyle = "#1f2f90";
      ctx.fillText(word_label, word_label_x, 50);
      ctx.fillStyle = old_fill;

      ctx.font = "50px Comic Sans MS, cursive, TSCu_Comic, sans-serif"; 
      let dashLen = 220, dashOffset = dashLen, speed = 11, i = 0;
      let x = (ctx.canvas.width / 2) - Math.floor((ctx.measureText(txt).width + ctx.lineWidth) / 2);

      (function loop() {
        ctx.setLineDash([dashLen - dashOffset, dashOffset - speed]);
        dashOffset -= speed;
        ctx.strokeText(txt[i], x, 110);

        if (dashOffset > 0) workerTimers.setTimeout(loop, 16);
        else {
          dashOffset = dashLen;
          x += ctx.measureText(txt[i++]).width + ctx.lineWidth;
          if (i < txt.length) workerTimers.setTimeout(loop, 16);
        }
      })();
    }
  }));

  const mouseMove = (e) => {
    if (!penDown || !props.myTurn || inkAmount <= 0) return;

    const canvas = canvasRef.current;
    let x2 = e.pageX - canvas.offsetLeft;
    let y2 = e.pageY - canvas.offsetTop;
    props.socket.emit('draw', [x1, y1, x2, y2]);
    setX1(x2);
    setY1(y2);
  };
  const mouseDown = (e) => {
    const canvas = canvasRef.current;
    setPenDown(true);
    setX1(e.pageX - canvas.offsetLeft)
    setY1(e.pageY - canvas.offsetTop)
  };
  const mouseUp = (e) => {
    setPenDown(false);
  };
  const mouseOut = (e) => {
    setPenDown(false);
  };

  const touchMove = (e) => {
    var touch = e.touches[0];
    mouseMove({
      pageX: touch.pageX,
      pageY: touch.pageY,
    });
  }
  const touchStart = (e) => {
    var touch = e.touches[0];
    mouseDown({
      pageX: touch.pageX,
      pageY: touch.pageY,
    });
  };
  const touchEnd = (e) => {
    mouseUp();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const onDraw = data => {
      drawLine(context, data.coords, data.color);
      setInkAmount(data.inkAmount);
    };

    const onInitialize = room => {
      for (let data of room.lines) {
        drawLine(context, data.line, data.color);
      }
    };

    props.socket.on('draw', onDraw);
    props.socket.on('initialize', onInitialize);

    return () => {
      props.socket.off('draw', onDraw);
      props.socket.off('initialize', onInitialize);
    };
  }, [canvasRef, props.socket]);
  
  return (
    <div className="draw-area">
      <canvas ref={canvasRef}
        onMouseDown={mouseDown} onMouseUp={mouseUp} onMouseMove={mouseMove} onMouseOut={mouseOut}
        onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchMove={touchMove}
        width="500" height="400" />
      <div className="draw-info box">
        <h3>{ props.drawTimer }</h3>
        <progress value={ inkAmount } max="100" className={ inkColor }>{ inkAmount }%</progress>
      </div>
  </div>
  )
});

export default Canvas;