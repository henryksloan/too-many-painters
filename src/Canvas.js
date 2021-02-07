import React, { useRef, useEffect } from 'react'

const Canvas = props => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = 'red';
    context.lineWidth = 5;
    context.lineCap = 'round'; 

    const drawLine = function(coords) {
      context.beginPath();
      context.moveTo(coords[0], coords[1]);
      context.lineTo(coords[2], coords[3]);
      context.stroke();
      context.closePath();
    };

    props.socket.on('draw', drawLine);

    props.socket.on('initialize', room => {
      for (let data of room.lines) {
        drawLine(data);
      }
    });
    props.socket.emit('initialize');

    let penDown = false;
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    const render = () => {
      canvas.addEventListener("mousemove", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!penDown) return;
        x2 = e.clientX - canvas.offsetLeft;
        y2 = e.clientY - canvas.offsetTop;
        drawLine([x1, y1, x2, y2]);
        props.socket.emit('draw', [x1, y1, x2, y2]);
        x1 = x2;
        y1 = y2;
      }, false);
      canvas.addEventListener("mousedown", function (e) {
        penDown = true;
        x1 = e.clientX - canvas.offsetLeft;
        y1 = e.clientY - canvas.offsetTop;
      }, false);
      canvas.addEventListener("mouseup", function (e) {
        penDown = false;
      }, false);
      canvas.addEventListener("mouseout", function (e) {
        penDown = false;
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
    }
    render()
  }, [props.socket]);
  
  return <canvas ref={canvasRef} {...props} />
}

export default Canvas;