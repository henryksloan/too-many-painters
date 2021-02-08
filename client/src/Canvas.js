import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react'

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

// const Canvas = props => {
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
    }
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
  }, [canvasRef, props.socket]);
  
  return (
    <div className="draw-area">
      <canvas ref={canvasRef} onMouseMove={ mouseMove } width="500" height="400" />
      <progress value={ inkAmount } max="100">{ inkAmount }%</progress>
      { inkAmount }%
  </div>
  )
});

export default Canvas;