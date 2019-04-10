import { socket } from './api';

let bufferSize = 2048,
  processor,
  input,
  globalStream,
  analyser;

let startedStreaming = false;

let dataArray = new Uint8Array(0);

const constraints = {
  audio: true,
  video: false
};
function animatedStreaming(context, audio){
  if(!audio){
    startStreaming(context);
  }
  else {
    if(analyser){
      analyser.getByteTimeDomainData(dataArray);
      return dataArray;
    }
    else return new Uint8Array(0);
  }
}
function startStreaming(context) {
  socket.emit('startStreaming', true);
  startedStreaming = true;
  bufferSize = 2048;
  processor = null;
  input = null;
  globalStream = null;
  analyser = null;
  dataArray = null;

  processor = context.createScriptProcessor(bufferSize, 1, 1);
  processor.connect(context.destination);
  context.resume();

  var handleSuccess = function (stream) {
    globalStream = stream;

    analyser = context.createAnalyser();
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    if (input == undefined){
      input = context.createMediaStreamSource(stream);
      input.connect(analyser);

      input.connect(processor);

      processor.onaudioprocess = function (e) {
        const left = e.inputBuffer.getChannelData(0);
        const int16Buffer = Int16Array.from(left.map(n => n * 32767)).buffer;
        //console.log(int16Buffer);
        socket.emit('binaryStream', int16Buffer);
      };
    }

  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(handleSuccess);
}

function stopStreaming(context) {
  socket.emit('stopStreaming', true);
  if (globalStream) {
    let track = globalStream.getTracks()[0];
    track.stop();
    if(input){
      input.disconnect(processor);
      processor.disconnect();
      analyser.disconnect();
    }
  }

}

export { startStreaming, stopStreaming, animatedStreaming }
