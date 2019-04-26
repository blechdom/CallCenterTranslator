import openSocket from 'socket.io-client';
const socket = openSocket('http://localhost:8080');

function getVoiceList(cb) {
  socket.emit('getVoiceList', true);
  socket.on('voicelist', function(data) {
    let voicelist = JSON.parse(data);
    cb(null, voicelist);
  });
}

function setVoiceCode(voiceCode){
  socket.emit("voiceCode", voiceCode);
}

function setAutoMute(autoMute){
  socket.emit("autoMute", autoMute);
}
function setApproveText(approveText){
  socket.emit("approveText", approveText);
}
function setPlayBothAudio(playBothAudio){
  socket.emit("playBothAudio", playBothAudio);
}

export {
  socket,
  getVoiceList,
  setVoiceCode,
  setAutoMute,
  setApproveText,
  setPlayBothAudio
};
