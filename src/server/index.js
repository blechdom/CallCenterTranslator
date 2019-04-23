'use strict';
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const speech = require('@google-cloud/speech').v1p1beta1;
const textToSpeech = require('@google-cloud/text-to-speech');
const {Translate} = require('@google-cloud/translate');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('dist'));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '')));

let usernames=[];
let userlanguages=[];
const streamingLimit = 30000;
let interactionMode = 'push-to-talk';

io.on('connection', (socket) => {
  console.log("New client connected: " + socket.id);
  console.log("all sockets " + JSON.stringify(Object.keys(io.sockets.sockets), null, 4));
  let username = '',
    autoMute = true,
    approveText = false,
    speechClient = new speech.SpeechClient(),
    ttsClient = new textToSpeech.TextToSpeechClient(),
    translate = new Translate(),
    recognizeStream = null,
    ttsText = '',
    translateText = {},
    sttLanguageCode = 'en-US',
    voiceCode = 'en-US-Wavenet-D',
    speechLanguageCode = 'en-US-Wavenet-D',
    restartCounter = 0,
    restartTimeoutId = null,
    resultEndTime = 0,
    isFinalEndTime = 0,
    finalRequestEndTime = 0,
    audioArray = [],
    lastAudioArray = [],
    newStream = true,
    timeOffset = 0,
    lastTranscriptWasFinal = false;

  io.sockets.emit("updateYourself", usernames.length);

  function resetClient(){
    username = '';
    autoMute = true;
    approveText = false;
    speechClient = new speech.SpeechClient();
    ttsClient = new textToSpeech.TextToSpeechClient();
    translate = new Translate();
    recognizeStream = null;
    ttsText = '';
    translateText = {};
    sttLanguageCode = 'en-US',
    voiceCode = 'en-US-Wavenet-D';
    speechLanguageCode = 'en-US-Wavenet-D';
    restartCounter = 0;
    restartTimeoutId = null;
    resultEndTime = 0;
    isFinalEndTime = 0;
    finalRequestEndTime = 0;
    audioArray = [];
    lastAudioArray = [];
    newStream = true;
    timeOffset = 0;
    lastTranscriptWasFinal = false;

  io.sockets.emit("updateYourself", usernames.length);
  }

  socket.on('translate-text', function(data){
    translateText.transcript = data;
  });
  socket.on('voiceCode', function(data) {
    voiceCode = data;
  });
  /*socket.on('interactionMode', function(data) {
    if(usernames.length==0){
      interactionMode = data;
      io.sockets.emit("getInteractionMode", "enable");
    }
    if(usernames.length==1){
      io.sockets.emit("getInteractionMode", interactionMode);
    }
  });*/
  socket.on('autoMute', function(data) {
    console.log("autoMute: " + data);
    autoMute = data;
  });
  socket.on('approveText', function(data) {
    console.log("approveText: " + data);
    approveText = data;
  });
  socket.on('speechLanguageCode', function(data) {
    console.log("speech language code: " + data);
    speechLanguageCode = data;
  });
  socket.on('sttLanguageCode', function(data) {
    console.log("sttLanguageCode: " + data);
    sttLanguageCode = data;
  });

  socket.on("startStreaming", function(data){
    startStreaming();
    audioArray = [];
    lastAudioArray = [];
    io.sockets.emit("allStatus", username + ' speaking');
  });

  socket.on('binaryStream', function(data) {
    if(interactionMode=='continuous'){
      if(newStream && (lastAudioArray.length !=0 )) {
        console.log("new Stream? " + newStream + " last array length " + lastAudioArray.length);
        let chunkTime = streamingLimit / lastAudioArray.length;

        if(chunkTime != 0){
          if (timeOffset < 0) {
            timeOffset = 0;
          }
          if(timeOffset > finalRequestEndTime) {
            timeOffset = finalRequestEndTime;
          }
          let chunksFromMS = Math.floor((finalRequestEndTime - timeOffset) / chunkTime);
          timeOffset = Math.floor(
            (lastAudioArray.length - chunksFromMS) * chunkTime
          );
          console.log("last audio array length: " + lastAudioArray.length + " chunk time: " + chunkTime + " timeOffset: " + timeOffset + " chunks from ms " + chunksFromMS);
          for(let i=chunksFromMS; i<lastAudioArray.length; i++){
            if(recognizeStream!=null) {
              recognizeStream.write(lastAudioArray[i]);
            }
          }
        }
        newStream = false;
      }

      audioArray.push(data);
    }
    if(recognizeStream!=null) {
      recognizeStream.write(data);
    }
  });

  socket.on("stopStreaming", function(data){
    if (interactionMode=='continuous'){
      clearTimeout(restartTimeoutId);
      lastAudioArray = [];
    }
    stopStreaming();
  });

  socket.on('getAvailableRoles', function(data) {
    io.sockets.emit("availableRoles", usernames);
    console.log("available roles: " + usernames.length);
    if(usernames.length==1){
      socket.broadcast.emit("getInteractionMode", interactionMode);
    }
    if(usernames.length==0){

      socket.broadcast.emit("getInteractionMode", "enable");
    }
    //socket.broadcast.emit("availableRoles", usernames);
  });

  socket.on("joinCall", function(data){
    console.log(data + " has joined the call");
    usernames.push(data.username);
    username=data.username;
    interactionMode = data.interactionMode;
    console.log("usernames: " + usernames);
    for(var i in usernames){
      console.log(usernames[i]);
      if(usernames[i]==username){
        userlanguages[i] = voiceCode;
        console.log("setting " + usernames[i] + " language to " + userlanguages[i]);
      }
    }
    if(usernames.length>0){
      io.sockets.emit("getInteractionMode", interactionMode);
    }
    if(usernames.length==0){
      socket.broadcast.emit("getInteractionMode", "enable");
    }
    io.sockets.emit("availableRoles", usernames);
    socket.emit("loginToCall", true);
  });

  socket.on("getUsername", function(data){
    const languageName = convertLanguageCodes(voiceCode.substring(0,5));
    var otherCallersVoiceCode = '';
    var otherLanguage = '';
    for(var i in usernames){
      if(usernames[i] != username){
        otherCallersVoiceCode = userlanguages[i];
      }
    }
    if(otherCallersVoiceCode){
      otherLanguage = convertLanguageCodes(otherCallersVoiceCode.substring(0, 5)); //en
    }
    const userInfo = {
      username: username,
      language: languageName,
      otherLanguage: otherLanguage,
      interactionMode: interactionMode,
      autoMute: autoMute,
      approveText: approveText,
    };

    socket.emit("myUsernameIs", userInfo);
    socket.broadcast.emit("updateYourself", usernames.length);
  });

  socket.on("resetCall", function(data){
    console.log("resettingCall");
    resetClient();
    usernames = [];
    userlanguages = [];
    io.sockets.emit("resetTranslator", true);
    //socket.broadcast.emit("resetTranslator", true);
    io.sockets.emit("resetLogin", true);
    //socket.broadcast.emit("resetLogin", true);
    io.sockets.emit("availableRoles", usernames);
    //socket.broadcast.emit("availableRoles", usernames);
  });
  socket.on("leaveCall", function(data){
    console.log(username + " leaving Call");
    let userRole = username;
    if(usernames[0]==userRole){
      usernames.splice(0,1);
      userlanguages.splice(0,1);
    }
    else if(usernames[1]==userRole){
      usernames.splice(1,1);
      userlanguages.splice(1,1);
    }
    resetClient();
    socket.emit("resetTranslator", true);
    socket.emit("resetLogin", true);
    io.sockets.emit("availableRoles", usernames);
    //socket.broadcast.emit("availableRoles", usernames);
  });
  socket.on("resetMyData", function(data){
    resetClient();
  });
  socket.on('getVoiceList', function(data) {
    async function getList(){
      try {
        const [result] = await ttsClient.listVoices({});
        const voiceList = result.voices;

        voiceList.sort(function(a, b) {
          var textA = a.name.toUpperCase();
          var textB = b.name.toUpperCase();
          return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
        let languageObject = {};
        let languageName = "";
        let languageCode = "";
        let lastVoice = "";
        let languageTypes = [];

        const formattedVoiceList = [];

        for (let i = 0; i<voiceList.length; i++) {
          const voice = voiceList[i];
          languageCode = voice.languageCodes[0];
          if (languageCode!=lastVoice){
            if (languageObject.languageName!=null){
              languageObject.languageTypes = formatLanguageTypes(languageTypes);
              formattedVoiceList.push(languageObject);

              languageObject = {};
              languageTypes = [];
            }

            languageName = convertLanguageCodes(languageCode);
            languageObject.languageName = languageName;
            languageObject.languageCode = languageCode;

            languageTypes.push({
              voice: voice.name,
              gender: voice.ssmlGender,
              rate: voice.naturalSampleRateHertz
            });
            lastVoice = languageCode;
          } else {
            languageTypes.push({
              voice: voice.name,
              gender: voice.ssmlGender,
              rate: voice.naturalSampleRateHertz
            });
          }
          if(i==(voiceList.length-1)){
              languageObject.languageTypes = formatLanguageTypes(languageTypes);
              formattedVoiceList.push(languageObject);

              languageObject = {};
              languageTypes = [];
          }
        }
        socket.emit('voicelist', JSON.stringify(formattedVoiceList));
      } catch(err) {
        console.log(err);
      }
    }
    getList();
  });

  socket.on('forceFinal', function(data){
    var otherCallersVoiceCode = '';

    for(var i in usernames){
      if(usernames[i] != username){
        otherCallersVoiceCode = userlanguages[i];
      }
    }
    console.log("forcing final");
    if(translateText.transcript){
      translateText.isfinal = true;
      ttsTranslateAndSendAudio(otherCallersVoiceCode);
    }
    else {
      io.sockets.emit("allStatus", 'open');
    }
    if (interactionMode=='continuous'){
      clearTimeout(restartTimeoutId);
      lastAudioArray = [];
    }
    stopStreaming();
  });

  socket.on("audioPlaybackComplete", function(data){
    io.sockets.emit("allStatus", 'open');
  });
  socket.on("myAudioVizData", function(data){
    socket.broadcast.emit("theirAudioVizData", { buffer: data });
  });

  socket.on("translateAndSendThisText", function(data){
    var otherCallersVoiceCode = '';

    for(var i in usernames){
      if(usernames[i] != username){
        otherCallersVoiceCode = userlanguages[i];
      }
    }
    var transcriptObject = {
      transcript: data,
      isfinal: true
    };

    socket.broadcast.emit("getTheirTranscript", transcriptObject);
    translateText = transcriptObject;

    socket.emit("stopRecording", true);

    console.log("translate and send audio to other caller");
    ttsTranslateAndSendAudio(otherCallersVoiceCode);

  });

  socket.on('disconnect', function() {
    console.log('client disconnected');
    let userRole = username;
    if(usernames[0]==userRole){
      usernames.splice(0,1);
      userlanguages.splice(0,1);
    }
    else if(usernames[1]==userRole){
      usernames.splice(1,1);
      userlanguages.splice(1,1);
    }
    io.sockets.emit("updateYourself", usernames.length);
  });

  async function translateOnly(otherCallersVoiceCode){

    if(otherCallersVoiceCode){
      var translateLanguageCode = otherCallersVoiceCode.substring(0, 2); //en
      var target = translateLanguageCode;

      var text = translateText.transcript;

      let [translations] = await translate.translate(text, target);
      translations = Array.isArray(translations) ? translations : [translations];
      var translationConcatenated = "";
      translations.forEach((translation, i) => {
        translationConcatenated += translation + " ";
      });
      ttsText = translationConcatenated;
      let translatedObject = {
        transcript: translateText.transcript,
        translation: translationConcatenated,
        isfinal: translateText.isfinal
      }
      socket.emit("getTranscript", translatedObject);
      socket.broadcast.emit("getTheirTranslation", translatedObject);

    }
    else{
      let translatedObject = {
        transcript: translateText.transcript,
        translation: "(...waiting for other caller...)",
        isfinal: translateText.isfinal
      }
      socket.emit("getTranscript", translatedObject);
    }

  }

  async function ttsTranslateAndSendAudio(otherCallersVoiceCode){
    io.sockets.emit("allStatus", username + ' processing');
    await translateOnly(otherCallersVoiceCode);
    if(otherCallersVoiceCode){
      var ttsRequest = {
        voice: {
          languageCode: otherCallersVoiceCode.substring(0,5),
          name: otherCallersVoiceCode
        },
        audioConfig: {audioEncoding: 'LINEAR16'},
        input: {text: ttsText}
      };

      const [response] =
        await ttsClient.synthesizeSpeech(ttsRequest);
        socket.broadcast.emit('audiodata', response.audioContent);
        io.sockets.emit("allStatus", username + ' playback');
    }
  }
  function startStreaming() {
    ttsText = '';
    translateText = {};
    if(interactionMode=='continuous'){
      audioArray = [];
    }
    let langCode = '';
    if(voiceCode){
      langCode = voiceCode.substring(0,5);
    }

    let sttRequest = {
      config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 44100,
          languageCode: langCode,
          enableAutomaticPunctuation: true
      },
      interimResults: true
    };

    if(speechClient){
      recognizeStream = speechClient
        .streamingRecognize(sttRequest)
        .on('error', (error) => {
          console.error;
        })
        .on('data', speechCallback);

      if(interactionMode=='continuous'){
        restartTimeoutId =
          setTimeout(restartStreaming, streamingLimit);
      }
    }
  }
    function stopStreaming(){
      if(recognizeStream){
        recognizeStream.removeListener('data', speechCallback);
        recognizeStream = null;
      }
      if(interactionMode=='continuous'){
        if(resultEndTime>0){
            finalRequestEndTime = isFinalEndTime;
        }
        resultEndTime = 0;
        lastAudioArray = [];
        lastAudioArray = audioArray;
      }
    }
    function restartStreaming() {
      stopStreaming();
      newStream=true;
      startStreaming();
    }
    const speechCallback = (stream) => {
        var translateLanguageCode = '';
        var otherCallersVoiceCode = '';

        for(var i in usernames){
          if(usernames[i] != username){
            otherCallersVoiceCode = userlanguages[i];
          }
        }
        if (stream.results[0] && stream.results[0].alternatives[0]) {

          var transcriptObject = {
            transcript: stream.results[0].alternatives[0].transcript,
            isfinal: stream.results[0].isFinal
          };

          if(interactionMode=='continuous'){
            resultEndTime = stream.results[0].resultEndTime.seconds * 1000 +
            Math.round(stream.results[0].resultEndTime.nanos / 1000000);

            let correctedTime =
              resultEndTime - timeOffset + (streamingLimit * restartCounter);

            socket.broadcast.emit("getTheirTranscript", transcriptObject);
            translateText = transcriptObject;

            if(stream.results[0].isFinal){
              isFinalEndTime = resultEndTime;
              lastTranscriptWasFinal = true;
              ttsTranslateAndSendAudio(otherCallersVoiceCode);
            }
            else{
              lastTranscriptWasFinal = false;
              translateOnly(otherCallersVoiceCode);
            }
          }
          else {
            if(approveText){
              socket.emit("textNeedsApproval", transcriptObject);
              if(stream.results[0].isFinal){
                socket.emit("stopRecording", true);
              }
            }
            else {

              socket.broadcast.emit("getTheirTranscript", transcriptObject);
              translateText = transcriptObject;

              if(stream.results[0].isFinal){
                socket.emit("stopRecording", true);
                ttsTranslateAndSendAudio(otherCallersVoiceCode);
              }
              else{
                translateOnly(otherCallersVoiceCode);
              }
            }
          }
        }
    };

  function formatLanguageTypes(voiceObjects) {
    let voiceTypes = [];
    let voiceSynths = [];

    let lastSynth = '';
    let currentSynth = '';
    let tempVoiceObject = {};

    for (let i = 0; i<voiceObjects.length; i++) {
      currentSynth = voiceObjects[i].voice.slice(6,-2);

      if (currentSynth!=lastSynth) {
        if(tempVoiceObject.voiceSynth!=null) {
          tempVoiceObject.voiceTypes = voiceTypes;
          voiceSynths.push(tempVoiceObject);
          tempVoiceObject = {};
          voiceTypes = [];
        }
        tempVoiceObject.voiceSynth = currentSynth;

        lastSynth = currentSynth;
      }
      voiceTypes.push({
        voiceCode: voiceObjects[i].voice,
        voiceName:
          voiceObjects[i].voice.substr(voiceObjects[i].voice.length - 1) + " (" + voiceObjects[i].gender.substr(0,1).toLowerCase() + ")"
      });

      if(i==(voiceObjects.length-1)) {
        tempVoiceObject.voiceTypes = voiceTypes;
        voiceSynths.push(tempVoiceObject);
        tempVoiceObject = {};
        voiceTypes = [];
      }
    }
    return voiceSynths;
  }

  function convertLanguageCodes(languageCode) {
    let languageName;
    switch (languageCode) {
      case 'ar-XA':
        languageName = "Arabic";
        break;
      case 'da-DK':
        languageName = "Danish";
        break;
      case 'de-DE':
        languageName = "German";
        break;
      case 'en-AU':
        languageName = "English (Australia)"
        break;
      case 'en-GB':
        languageName = "English (United Kingdom)"
        break;
      case 'en-IN':
        languageName = "English (India)";
        break;
      case 'en-US':
        languageName = "English (United States)";
        break;
      case 'es-ES':
        languageName = "Spanish";
        break;
      case 'fr-CA':
        languageName = "French (Canada)";
        break;
      case 'fr-FR':
        languageName = "French";
        break;
      case 'hu-HU':
        languageName = "Hungarian";
        break;
      case 'it-IT':
        languageName = "Italian"
        break;
      case 'ja-JP':
        languageName = "Japanese"
        break;
      case 'ko-KR':
        languageName = "Korean";
        break;
      case 'nl-NL':
        languageName = "Dutch"
        break;
      case 'nb-NO':
        languageName = "Norwegian"
        break;
      case 'pl-PL':
        languageName = "Polish";
        break;
      case 'pt-BR':
        languageName = "Portugese (Brazil)";
        break;
      case 'pt-PT':
        languageName = "Portugese"
        break;
      case 'ru-RU':
        languageName = "Russian";
        break;
      case 'sk-SK':
        languageName = "Slovak (Slovakia)";
        break;
      case 'sv-SE':
        languageName = "Swedish";
        break;
      case 'tr-TR':
        languageName = "Turkish"
        break;
      case 'uk-UA':
        languageName = "Ukrainian (Ukraine)"
        break;
      case 'vi-VN':
        languageName = "Vietnamese"
        break;
      default:
        languageName = languageCode;
    }
    return languageName;
  }
});
if (module === require.main) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
}
