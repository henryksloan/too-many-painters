import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react'

import * as workerTimers from 'worker-timers';

const pixels_per_percent = 40;

function drawLine(context, coords) {
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
  let [inkAmount, setInkAmount] = useState(35);
  let [penDown, setPenDown] = useState(false);
  let [x1, setX1] = useState(0);
  let [y1, setY1] = useState(0);

  useImperativeHandle(ref, () => ({
    setInk(inkAmount, color) {
      setInkAmount(inkAmount);
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
        // if (dashOffset > 0) requestAnimationFrame(loop);
        if (dashOffset > 0) workerTimers.setTimeout(loop, 16);
      })();
      ctx.fillRect(x, y - 90, 60, 150);
    },
  }));

  const mouseMove = (e) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    e.preventDefault();
    e.stopPropagation();
    if (!penDown || !props.myTurn || inkAmount <= 0) return;
    let x2 = e.clientX - canvas.offsetLeft;
    let y2 = e.clientY - canvas.offsetTop;
    let data1 = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    drawLine(context, [x1, y1, x2, y2]);
    let data2 = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    let pixels_changed = 0;
    // TODO: In principle, this should only have to check an area enclosing the two points, with sufficient padding
    for (let i = 0; i < data1.data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        if (data1.data[i+j] !== data2.data[i+j]) pixels_changed += 1;
      }
    }
    setInkAmount(amount => amount - (pixels_changed / pixels_per_percent));
    props.socket.emit('draw', [x1, y1, x2, y2]);
    setX1(x2);
    setY1(y2);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    props.socket.on('draw', line => drawLine(context, line));

    props.socket.on('initialize', room => {
      for (let data of room.lines) {
        drawLine(context, data);
      }
    });

    canvas.addEventListener("mousedown", function (e) {
      setPenDown(true);
      setX1(e.clientX - canvas.offsetLeft)
      setY1(e.clientY - canvas.offsetTop)
    }, false);
    canvas.addEventListener("mouseup", function (e) {
      setPenDown(false);
    }, false);
    canvas.addEventListener("mouseout", function (e) {
      setPenDown(false);
    }, false);

    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var touch = e.touches[0];
      var mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      canvas.dispatchEvent(mouseEvent);
    }, false);
    canvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var touch = e.touches[0];
      var mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      canvas.dispatchEvent(mouseEvent);
    }, false);
    canvas.addEventListener("touchend", function (e) {
      var mouseEvent = new MouseEvent("mouseup", {});
      canvas.dispatchEvent(mouseEvent);
    });

    return () => { props.socket.removeAllListeners() };
  }, [canvasRef, props.socket]);
  
  return (
    <div className="draw-area">
      <canvas ref={canvasRef} onMouseMove={ mouseMove } width="500" height="400" />
      <div className="draw-info box">
        { props.drawTimer }
        <progress value={ inkAmount } max="100">{ inkAmount }%</progress>
      </div>
  </div>
  )
});

export default Canvas;