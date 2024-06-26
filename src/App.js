import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

function App() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const socket = io('http://localhost:8000');
    socket.on('frame', (data) => {
      // console.log(data)

      const updateCanvas = (frame) => {
        const image = new Image();
        image.src = 'data:image/jpeg;base64,' + frame;
        image.onload = () => {
          context.imageSmoothingEnabled = false; // Disable image smoothing
          context.clearRect(0, 0, canvas.width, canvas.height); // Clear the previous frame
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
        };
      }

      if (data?.stream) {
        // console.log(data)
        if (data.stream?.frame && data.stream?.state === "Running") {
          updateCanvas(data.stream?.frame)
        } else {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (data.stream?.state) {
          console.log(data.stream?.state)
        }

        if (data.stream?.error) {
          console.error(data.stream?.error)
        }
      }
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
