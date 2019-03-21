import React from 'react';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import MultilineOutput from './MultilineOutput';
import Button from '@material-ui/core/Button';
import { startStreaming, stopStreaming, playAudioBuffer, base64ToBuffer, disconnectSource } from './AudioUtils';

class CCConversation extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      audio: false,
      socket: this.props.socket
    };
    this.toggleListen = this.toggleListen.bind(this);
  }

  componentDidMount() {

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    this.state.socket.on('audiodata', (data) => {
      var audioFromString = base64ToBuffer(data);
      this.stopListening();
      playAudioBuffer(audioFromString, this.audioContext, false);

    });
  }
  componentWillUnmount() {
    this.stopListening();
    this.audioContext.close();
    this.state.socket.off("audiodata");
  }

  async startListening(){
    if(!this.state.audio){
      startStreaming(this.audioContext);
      this.setState({audio: true});
      console.log("startListening");
    }
  }
  stopListening(){
    if(this.state.audio){
      this.setState({audio:false});
      stopStreaming(this.audioContext);
      console.log("stopListening");
    }
  }
  toggleListen() {

      if (this.state.audio) {
        this.stopListening();
      } else {
        this.startListening();
      }
    }

  render(){
    return (
      <React.Fragment>
        <Grid container spacing={24}>
          <Grid item xs={12} zeroMinWidth>
            <Button variant="contained" color="primary" onClick={this.toggleListen}>{this.state.audio ? 'Stop Listening' : 'Start Listening'}</Button>
          </Grid>
          <Grid item xs={12} zeroMinWidth>
            <MultilineOutput socket={this.state.socket} speakToo="true" />
          </Grid>
        </Grid>
      </React.Fragment>
    );
  }
}

export default CCConversation;
