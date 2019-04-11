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

io.on('connection', (socket) => {
  console.log("New client connected: " + socket.id);
  let clientData = {};
  function createNewClient(){
    clientData[socket.id] = {
      username: '',
      speechClient: new speech.SpeechClient(),
      ttsClient: new textToSpeech.TextToSpeechClient(),
      translate: new Translate(),
      recognizeStream: null,
      ttsText: '',
      translateText: '',
      voiceCode: 'en-US-Wavenet-D',
      speechLanguageCode: 'en-US-Wavenet-D',
    }
  }
  createNewClient();

  socket.on('translate-text', function(data){
    clientData[socket.id].translateText.transcript = data;
  });

  socket.on('voiceCode', function(data) {
    console.log("voice code: " + data);
    clientData[socket.id].voiceCode = data;
  });

  socket.on('speechLanguageCode', function(data) {
    clientData[socket.id].speechLanguageCode = data;

  });
  socket.on('sttLanguageCode', function(data) {
    clientData[socket.id].sttLanguageCode = data;
  });

  socket.on("startStreaming", function(data){
    startStreaming();
    socket.emit("allStatus", clientData[socket.id].username + ' speaking');
    socket.broadcast.emit("allStatus", clientData[socket.id].username + ' speaking');

  });

  socket.on('binaryStream', function(data) {
    if(clientData[socket.id].recognizeStream!=null) {
      clientData[socket.id].recognizeStream.write(data);
    }
  });

  socket.on("stopStreaming", function(data){
    stopStreaming();
  });

  socket.on('getAvailableRoles', function(data) {
    socket.emit("availableRoles", usernames);
    socket.broadcast.emit("availableRoles", usernames);
  });

  socket.on("joinCall", function(username){
    console.log(username + " has joined the call");
    usernames.push(username);
    clientData[socket.id].username=username;
    console.log("usernames: " + usernames);
    for(var i in usernames){
      console.log(usernames[i]);
      if(usernames[i]==clientData[socket.id].username){
        userlanguages[i] = clientData[socket.id].voiceCode;
        console.log("setting " + usernames[i] + " language to " + userlanguages[i]);
      }
    }

    socket.emit("availableRoles", usernames);
    socket.broadcast.emit("availableRoles", usernames);
    socket.emit("loginToCall", true);
  });

  socket.on("getUsername", function(data){
    const languageName = convertLanguageCodes(clientData[socket.id].voiceCode.substring(0,5));
    var otherCallersVoiceCode = '';
    var otherLanguage = '';
    for(var i in usernames){
      if(usernames[i] != clientData[socket.id].username){
        otherCallersVoiceCode = userlanguages[i];
      }
    }
    if(otherCallersVoiceCode){
      otherLanguage = convertLanguageCodes(otherCallersVoiceCode.substring(0, 5)); //en
    }
    const userInfo = {
      username: clientData[socket.id].username,
      language: languageName,
      otherLanguage: otherLanguage
    };
      socket.emit("myUsernameIs", userInfo);
      socket.broadcast.emit("updateYourself", true);
  });

  socket.on("resetCall", function(data){
    console.log("resettingCall");
    createNewClient();
    usernames = [];
    socket.emit("resetTranslator", true);
    socket.broadcast.emit("resetTranslator", true);
    socket.emit("resetLogin", true);
    socket.broadcast.emit("resetLogin", true);
    socket.emit("availableRoles", usernames);
    socket.broadcast.emit("availableRoles", usernames);
  });
  socket.on("leaveCall", function(data){
    console.log(clientData[socket.id].username + " leaving Call");
    let userRole = clientData[socket.id].username;
    if(usernames[0]==userRole){
      usernames.splice(0,1);
      userlanguages.splice(0,1);
    }
    else if(usernames[1]==userRole){
      usernames.splice(1,1);
      userlanguages.splice(1,1);
    }
    createNewClient();
    socket.emit("resetTranslator", true);
    socket.emit("resetLogin", true);
    socket.emit("availableRoles", usernames);
    socket.broadcast.emit("availableRoles", usernames);
  });
  socket.on("resetMyData", function(data){
    createNewClient();
  });
  socket.on('getVoiceList', function(data) {
    async function getList(){
      try {
        const [result] = await clientData[socket.id].ttsClient.listVoices({});
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
    stopStreaming();
    console.log("forcing final");
    if(clientData[socket.id].translateText.transcript){

      clientData[socket.id].translateText.isfinal = true;
      ttsTranslateAndSendAudio();
    }
    else {
      socket.emit("allStatus", 'open');
      socket.broadcast.emit("allStatus", 'open');
    }
  });

  socket.on("audioPlaybackComplete", function(data){
    console.log("playback complete for " + [socket.id]);
    socket.emit("allStatus", 'open');
    socket.broadcast.emit("allStatus", 'open');
  });
  socket.on("myAudioVizData", function(data){
    socket.broadcast.emit("theirAudioVizData", { buffer: data });
  });
  socket.on('disconnect', function() {
    console.log('client disconnected');
    let userRole = clientData[socket.id].username;
    if(usernames[0]==userRole){
      usernames.splice(0,1);
      userlanguages.splice(0,1);
    }
    else if(usernames[1]==userRole){
      usernames.splice(1,1);
      userlanguages.splice(1,1);
    }
    clientData[socket.id]={};
  });

  async function translateOnly(){
    var translateLanguageCode = '';
    var otherCallersVoiceCode = '';
    for(var i in usernames){
      if(usernames[i] != clientData[socket.id].username){
        console.log("other users language to translate mine into is: " + userlanguages[i]);
        otherCallersVoiceCode = userlanguages[i];
      }
    }
    if(otherCallersVoiceCode){
      var translateLanguageCode = otherCallersVoiceCode.substring(0, 2); //en
      var target = translateLanguageCode;
      console.log("translating into " + target);
      var text = clientData[socket.id].translateText.transcript;
      console.log("text to translate: " + text);
      let [translations] = await clientData[socket.id].translate.translate(text, target);
      translations = Array.isArray(translations) ? translations : [translations];
      var translationConcatenated = "";
      translations.forEach((translation, i) => {
        translationConcatenated += translation + " ";
      });
      clientData[socket.id].ttsText = translationConcatenated;
      let translatedObject = {
        transcript: clientData[socket.id].translateText.transcript,
        translation: translationConcatenated,
        isfinal: clientData[socket.id].translateText.isfinal
      }
      socket.emit("getTranscript", translatedObject);
      //socket.broadcast.emit("getTranslation", translatedObject);
      socket.broadcast.emit("getTheirTranslation", translatedObject);
    }
    else{
      let translatedObject = {
        transcript: clientData[socket.id].translateText.transcript,
        translation: "(...waiting for other caller...)",
        isfinal: clientData[socket.id].translateText.isfinal
      }
      socket.emit("getTranscript", translatedObject);
      console.log("no other caller yet");
    }
  }

  async function ttsTranslateAndSendAudio(){
    socket.emit("allStatus", clientData[socket.id].username + ' processing');
    socket.broadcast.emit("allStatus", clientData[socket.id].username + ' processing');
    var translateLanguageCode = '';
    var otherCallersVoiceCode = '';
    for(var i in usernames){
      if(usernames[i] != clientData[socket.id].username){
        console.log("other users language to translate mine into is: " + userlanguages[i]);
        otherCallersVoiceCode = userlanguages[i];
      }
    }
    if(otherCallersVoiceCode){
      var translateLanguageCode = otherCallersVoiceCode.substring(0, 2); //en
      var target = translateLanguageCode;
      console.log("translating into " + target);
      var text = clientData[socket.id].translateText.transcript;
      console.log("text to translate: " + text);
      let [translations] = await clientData[socket.id].translate.translate(text, target);
      translations = Array.isArray(translations) ? translations : [translations];
      var translationConcatenated = "";
      translations.forEach((translation, i) => {
        translationConcatenated += translation + " ";
      });
      clientData[socket.id].ttsText = translationConcatenated;
      let translatedObject = {
        transcript: clientData[socket.id].translateText.transcript,
        translation: translationConcatenated,
        isfinal: clientData[socket.id].translateText.isfinal
      }
      socket.emit("getTranscript", translatedObject);
      //socket.broadcast.emit("getTranslation", translatedObject);
      socket.broadcast.emit("getTheirTranslation", translatedObject);


      var ttsRequest = {
        voice: {
          languageCode: otherCallersVoiceCode.substring(0,5),
          name: otherCallersVoiceCode
        },
        audioConfig: {audioEncoding: 'LINEAR16'},
        input: {text: clientData[socket.id].ttsText}
      };

      const [response] =
        await clientData[socket.id].ttsClient.synthesizeSpeech(ttsRequest);
        socket.broadcast.emit('audiodata', response.audioContent);
        socket.emit("allStatus", clientData[socket.id].username + ' playback');
        socket.broadcast.emit("allStatus", clientData[socket.id].username + ' playback');
    }
    else{
        let translatedObject = {
          transcript: clientData[socket.id].translateText.transcript,
          translation: "(...waiting for other caller...)",
          isfinal: clientData[socket.id].translateText.isfinal
        }
        socket.emit("getTranscript", translatedObject);
      console.log("no other caller yet");
    }
  }
  function startStreaming() {
    clientData[socket.id].audioArray = [];
    let langCode = '';
    if(clientData[socket.id].voiceCode){
      langCode = clientData[socket.id].voiceCode.substring(0,5);
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

    //console.log("startStream request " + JSON.stringify(sttRequest, null, 4));
    if(clientData[socket.id].speechClient){
        clientData[socket.id].recognizeStream = clientData[socket.id].speechClient
          .streamingRecognize(sttRequest)
          .on('error', (error) => {
            console.error;
          })
          .on('data', speechCallback);
    }
  }
    function stopStreaming(){
      if(clientData[socket.id].recognizeStream){
        clientData[socket.id].recognizeStream.removeListener('data', speechCallback);
        clientData[socket.id].recognizeStream = null;
      }
    }
    const speechCallback = (stream) => {
        if (stream.results[0] && stream.results[0].alternatives[0]) {

          console.log(stream.results[0].alternatives[0].transcript);
          var transcriptObject = {
            transcript: stream.results[0].alternatives[0].transcript,
            isfinal: stream.results[0].isFinal
          };

          socket.broadcast.emit("getTheirTranscript", transcriptObject);
          clientData[socket.id].translateText = transcriptObject;
          console.log("is final? " + JSON.stringify(clientData[socket.id].translateText));


          if(stream.results[0].isFinal){
            socket.emit("stopRecording", true);
            console.log("translate and send audio to other caller");
            ttsTranslateAndSendAudio();
          }
          else{
            translateOnly();
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
