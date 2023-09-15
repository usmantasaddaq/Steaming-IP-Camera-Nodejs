const onvif = require('node-onvif');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ONVIF configuration
const cameraAddress = '10.0.17.11';
const cameraUsername = 'your_camera_username';
const cameraPassword = 'your_camera_password';

const device = new onvif.OnvifDevice({
  xaddr: `http://${cameraAddress}/onvif/device_service`,
  user: cameraUsername,
  pass: cameraPassword,
});

device.init().then(() => {
  const profile = device.getCurrentProfile();
  const streamUrl = profile.getStreamUri('rtsp');
  
  // Express route to serve the HTML page
  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

  // WebSocket connection for streaming
  wss.on('connection', (ws) => {
    const ffmpeg = require('fluent-ffmpeg');
    const stream = ffmpeg(streamUrl)
      .inputFormat('rtsp')
      .outputFormat('mpeg1video')
      .pipe();

    stream.on('data', (data) => {
      ws.send(data, { binary: true }, (error) => {
        if (error) {
          console.error('WebSocket send error: ', error);
        }
      });
    });

    ws.on('close', () => {
      console.log('WebSocket closed.');
      stream.destroy();
    });
  });

  // Start the Express server
  server.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
}).catch((error) => {
  console.error('Error initializing ONVIF device:', error);
});
