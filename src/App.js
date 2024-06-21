import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

function App() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const socket = io('http://localhost:8080');
    socket.on('frame', (data) => {
      const image = new Image();
      image.src = 'data:image/jpeg;base64,' + data;
      image.onload = () => {
        context.imageSmoothingEnabled = false; // Disable image smoothing
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear the previous frame
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <canvas ref={canvasRef} width="640" height="480" />
    </div>
  );
}

export default App;
