import { socket } from './api';

let bufferSize = 2048,
  processor,
  input,
  globalStream;

const constraints = {
  audio: true,
  video: false
};

function startStreaming(context) {
  bufferSize = 2048;
  processor = null;
  input = null;
  globalStream = null;

  processor = context.createScriptProcessor(bufferSize, 1, 1);
  processor.connect(context.destination);
  context.resume();

  var handleSuccess = function (stream) {
    globalStream = stream;
    if (input == undefined){
      input = context.createMediaStreamSource(stream);
    }
    input.connect(processor);

    processor.onaudioprocess = function (e) {
      microphoneProcess(e);
    };
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(handleSuccess);
}

function microphoneProcess(e) {
  var left = e.inputBuffer.getChannelData(0);
  var left16 = downsampleBuffer(left, 44100, 16000);
  socket.emit('binaryStream', left16);
}

function stopStreaming(context) {
  let track = globalStream.getTracks()[0];
  track.stop();
  if(input){
    input.disconnect(processor);
    processor.disconnect();
  }
}
var downsampleBuffer = function (buffer, sampleRate, outSampleRate) {
    if (outSampleRate == sampleRate) {
        return buffer;
    }
    if (outSampleRate > sampleRate) {
        throw "downsampling rate show be smaller than original sample rate";
    }
    var sampleRateRatio = sampleRate / outSampleRate;
    var newLength = Math.round(buffer.length / sampleRateRatio);
    var result = new Int16Array(newLength);
    var offsetResult = 0;
    var offsetBuffer = 0;
    while (offsetResult < result.length) {
        var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        var accum = 0, count = 0;
        for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }

        result[offsetResult] = Math.min(1, accum / count)*0x7FFF;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result.buffer;
}
export { startStreaming, stopStreaming}
