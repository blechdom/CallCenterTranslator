import { socket } from './api';

let bufferSize = 2048,
  processor,
  input,
  globalStream,
  analyser,
  source,
  rafId;

let startedStreaming = false;

let dataArray = new Uint8Array(0);

const constraints = {
  audio: true,
  video: false
};
function animatedStreaming(context, audio){
  console.log("hello audio is " + audio);
  if(!audio){
    startStreaming(context);
  }
  else{
    console.log("in a tick");
    if(analyser){
      analyser.getByteTimeDomainData(dataArray);
      return dataArray;
    }
    else return new Uint8Array(0);
  //  analyser.getByteTimeDomainData(dataArray);
  //  return dataArray;
  }
  //return dataArray;
}
function startStreaming(context) {
  console.log("starting to stream");
  startedStreaming = true;
  bufferSize = 2048;
  processor = null;
  input = null;
  globalStream = null;
  analyser = null;
  source = null;
  dataArray = null;
  rafId = null;

  processor = context.createScriptProcessor(bufferSize, 1, 1);
  processor.connect(context.destination);
  console.log("connecting to destination");
  context.resume();
console.log("resume");
  var handleSuccess = function (stream) {
    console.log("handling success");
    globalStream = stream;

    analyser = context.createAnalyser();
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    if (input == undefined){
      input = context.createMediaStreamSource(stream);
      input.connect(analyser);

      analyser.connect(processor);

      processor.onaudioprocess = function (e) {
        microphoneProcess(e);
      };
    }

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
  console.log("stoppingStream")
  if (globalStream) {
    let track = globalStream.getTracks()[0];
    track.stop();
    if(input){
      input.disconnect(processor);
      processor.disconnect();
    }
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
export { startStreaming, stopStreaming, animatedStreaming }
