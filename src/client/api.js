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
function setInteractionMode(interactionMode){
  console.log("socket is " + interactionMode);
  socket.emit("interactionMode", interactionMode);
}
function setAutoMute(autoMute){
  socket.emit("autoMute", autoMute);
}
function setApproveText(approveText){
  socket.emit("approveText", approveText);
}

export {
  socket,
  getVoiceList,
  setVoiceCode,
  setInteractionMode,
  setAutoMute,
  setApproveText,
};
