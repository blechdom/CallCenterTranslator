import React from 'react';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import MultilineOutput from './MultilineOutput';
import Button from '@material-ui/core/Button';
import HeadsetIcon from '@material-ui/icons/HeadsetMicTwoTone';
import PersonIcon from '@material-ui/icons/PersonOutlineTwoTone';
import { startStreaming, stopStreaming } from './AudioUtils';

let source = null;
let audioBuffer = null;
let active_source = false;

class CCConversation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      audio: false,
      socket: this.props.socket,
      micText: 'Click to Start',
      username: '',
      myUsername: '',
      theirUsername: '',
      started: false
    };
    this.toggleListen = this.toggleListen.bind(this);
    this.playAudioBuffer = this.playAudioBuffer.bind(this);
  }

  componentDidMount() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    this.state.socket.on('audiodata', (data) => {
      this.stopListening();
      this.playAudioBuffer(data, this.audioContext, true);
    });
    this.state.socket.emit("getUsername", true);
    this.state.socket.on("myUsernameIs", (data) => {
      console.log("I am " + data.username);
      if(data.username=="agent"){
        this.setState({
          username: 'agent',
          myUsername: <div align='center'><HeadsetIcon style={{ fontSize: 40 }} color='primary'/>
                      <Typography color='primary'>Agent (you)</Typography>
                      <Typography color='primary'>{data.language}</Typography></div>,
          theirUsername: <div align='center'><PersonIcon style={{ fontSize: 40 }} color='secondary'/>
                        <Typography color='secondary'>Client</Typography>
                        <Typography color='secondary'>{data.otherLanguage}</Typography></div>
        });
      }
      else{
        this.setState({
          username: 'client',
          myUsername: <div align='center'><PersonIcon style={{ fontSize: 40 }} color='primary'/>
                      <Typography color='primary'>Client (you)</Typography>
                      <Typography color='primary'>{data.language}</Typography></div>,
          theirUsername: <div align='center'><HeadsetIcon style={{ fontSize: 40 }} color='secondary'/>             <Typography color='secondary'>Agent</Typography>
                        <Typography color='secondary'>{data.otherLanguage}</Typography></div>
        });
      }
    });
    this.toggleListen();
  }

  componentWillUnmount() {
    this.stopListening();
    this.audioContext.close();
    this.state.socket.off("audiodata");
    this.state.socket.off("myUsernameIs");
  }

  async startListening(){
    if(!this.state.audio){
      this.state.socket.emit("startStreaming", true);
      startStreaming(this.audioContext);
      this.setState({audio: true, started: true});
    }
  }
  stopListening(){
    if(this.state.audio){
      this.state.socket.emit("stopStreaming", true);
      this.setState({audio: false});
      stopStreaming(this.audioContext);
    }
  }
  toggleListen() {
    if (!this.state.started) {
      this.setState({micText: 'Mic Muted', started: true});
    }
    if (this.state.audio) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  playAudioBuffer(audioFromString, context) {
    if (active_source){
      source.stop(0);
      source.disconnect();
      active_source=false;
    }
    context.decodeAudioData(audioFromString, (buffer) => {
        active_source = true;
        audioBuffer = buffer;
        source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = false;
        source.connect(context.destination);
        source.start(0);
        active_source = true;
        source.onended = (event) => {
          if (this.state.started) {
            this.startListening();
          }
        };
    }, function (e) {
        console.log('Error decoding file', e);
    });
  }
  render(){
    return (
      <React.Fragment>
        <Grid container spacing={8}>
          <Grid item xs={3}><div align="center">{this.state.myUsername}</div></Grid>
          <Grid item xs={6}>
            <div align="center">
              <Button variant="contained" color={this.state.audio ? 'secondary' : 'primary'} onClick={this.toggleListen}>{this.state.audio ? 'Mic Active' : this.state.micText}</Button>
            </div>
          </Grid>
          <Grid item xs={3}><div align="center">{this.state.theirUsername}</div></Grid>
          <Grid item xs={12}>
            <MultilineOutput socket={this.state.socket} username={this.state.username}/>
          </Grid>
        </Grid>
      </React.Fragment>
    );
  }
}

export default CCConversation;
