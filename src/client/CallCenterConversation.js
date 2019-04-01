import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@material-ui/core/styles/withStyles';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import MultilineOutput from './MultilineOutput';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardMedia from '@material-ui/core/CardMedia';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Collapse from '@material-ui/core/Collapse';
import Avatar from '@material-ui/core/Avatar';
import HeadsetIcon from '@material-ui/icons/HeadsetMicTwoTone';
import PersonIcon from '@material-ui/icons/PersonOutlineTwoTone';
import IconButton from '@material-ui/core/IconButton';
import Fab from '@material-ui/core/Fab';
import MicOnIcon from '@material-ui/icons/MicTwoTone';
import MicOffIcon from '@material-ui/icons/MicOffTwoTone';
import AudioVisualiser from './AudioVisualiser';
import { startStreaming, stopStreaming, animatedStreaming } from './AudioUtils';

let source = null;
let audioBuffer = null;
let active_source = false;

const styles = theme => ({
  card: {
    maxWidth: 300,
  },
  myAvatar: {
    color: '#FFFFFF',
    backgroundColor: '#2196f3',
  },
  theirAvatar: {
    color: '#FFFFFF',
    backgroundColor: '#388e3c',
  },
});

class CCConversation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      audio: false,
      theirAudio: false,
      socket: this.props.socket,
      micText: 'Click to Start',
      username: '',
      myUsername: '',
      myAvatar: '',
      myLanguage: '',
      myStatusText: '',
      theirUsername: '',
      theirAvatar: '',
      theirLanguage: '',
      theirStatusText: '',
      started: false,
      autoMuted: false,
      audioVizData: new Uint8Array(0),
      theirAudioVizData: new Uint8Array(0)
    };
    this.toggleListen = this.toggleListen.bind(this);
    this.playAudioBuffer = this.playAudioBuffer.bind(this);
    this.tick = this.tick.bind(this);
  }

  componentDidMount() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    this.state.socket.on('audiodata', (data) => {
      this.stopListening();
      this.playAudioBuffer(data, this.audioContext, true);
    });
    this.state.socket.emit("getUsername", true);
    this.state.socket.on("myUsernameIs", (data) => {
      if(data.theirLanguage){
        this.setState({
          theirStatusText: "Not Available",
          myStatusText: "Waiting for other caller"
        });

      }
      if(data.username=="agent"){
        this.setState({
          username: 'agent',
          myUsername: 'Agent (you)',
          myAvatar: <HeadsetIcon/>,
          myLanguage: data.language,
          theirUsername: 'Client',
          theirAvatar: <PersonIcon/>,
          theirLanguage: data.otherLanguage,
        });
      }
      else{
        this.setState({
          username: 'client',
          myUsername: 'Client (you)',
          myAvatar: <PersonIcon/>,
          myLanguage: data.language,
          theirUsername: 'Agent',
          theirAvatar: <HeadsetIcon/>,
          theirLanguage: data.otherLanguage,
        });
      }
    });
    this.state.socket.on("theirAudioVizData", (b) => {
      var uint8Arr = new Uint8Array(b.buffer);
      this.setState({theirAudioVizData: uint8Arr});
    });
    this.state.socket.on("theirStatus", (status) => {
      if(status=="mic-on"){
        this.setState({
          theirAudio: true,
          theirStatusText: 'Microphone On'
        });
      }
      if(status=="mic-off"){
        this.setState({
          theirAudio: false,
          theirStatusText: 'Microphone Off'
        });
      }
    });
    this.state.socket.on("myStatus", (status) => {

    });
    this.toggleListen();
  }

  componentWillUnmount() {
    this.stopListening();
    this.audioContext.close();
    this.state.socket.off("audiodata");
    this.state.socket.off("myUsernameIs");
    this.state.socket.off("theirAudioVizData");
    this.state.socket.off("theirStatus");
  }

  async startListening(){
    if(!this.state.audio){

      this.state.socket.emit("startStreaming", true);
      this.rafId = requestAnimationFrame(this.tick);
      this.dataArray = new Uint8Array(0);
    }
  }

  tick() {
    let audioVizData = new Uint8Array(0);
    if (!this.state.audio){
      animatedStreaming(this.audioContext, this.state.audio);
      this.setState({audio: true, started: true, myStatusText: "Microphone On" });
    }
    else{
      audioVizData = animatedStreaming(this.audioContext, this.state.audio);
      this.setState({audio: true, started: true, audioVizData: audioVizData });
      let audioVizBuffer = audioVizData.buffer;
      this.state.socket.emit("myAudioVizData", audioVizBuffer);
    }

    this.rafId = requestAnimationFrame(this.tick);
  }
  stopListening(){
    if(this.state.audio){
      cancelAnimationFrame(this.rafId);
      this.state.socket.emit("stopStreaming", true);
      this.setState({audio: false, myStatusText: 'Microphone Off'});
      stopStreaming(this.audioContext);
    }
  }
  toggleListen() {
    this.setState({autoMuted:false});
    if (!this.state.started) {
      this.setState({micText: 'Mic Muted', started: true});
    }
    if (this.state.audio) {
      this.stopListening();
    } else {
      this.setState({autoMuted: true});
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
          if ((this.state.started)&&(this.state.autoMuted)) {
            this.startListening();
          }
        };
    }, function (e) {
        console.log('Error decoding file', e);
    });
  }
  render(){
    const { classes } = this.props;

    return (
      <React.Fragment>
        <Grid container spacing={8}>
          <Grid item xs={6}>
            <Card className={classes.card}>
              <CardHeader
                avatar={
                  <Avatar aria-label="Chat-Role" className={classes.myAvatar}>
                    {this.state.myAvatar}
                  </Avatar>
                }
                action={
                  <Fab size="small" color={this.state.audio ? 'primary' : 'secondary'} onClick={this.toggleListen}>
                    {this.state.audio ? <MicOnIcon /> : <MicOffIcon/>}
                  </Fab>
                }
                title={this.state.myUsername}
                subheader={this.state.myLanguage}
              />
              <CardContent>
                <div align="center" style={{ marginLeft: -16}} ><AudioVisualiser audioVizData={this.state.audioVizData} color='#1976d2'/></div>
                <Typography component="p">
                  Status: {this.state.myStatusText}
                </Typography>
              </CardContent>

            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card className={classes.card}>
              <CardHeader
                avatar={
                  <Avatar aria-label="Chat-Role" className={classes.theirAvatar}>
                    {this.state.theirAvatar}
                  </Avatar>
                }
                action={
                  <Fab size="small" color={this.state.theirAudio ? 'secondary' : "primary"}>
                    {this.state.theirAudio ? <MicOnIcon/> : <MicOffIcon />}
                  </Fab>
                }
                title={this.state.theirUsername}
                subheader={this.state.theirLanguage}
              />
              <CardContent>
                <div align="center" style={{ marginLeft: -16}}><AudioVisualiser audioVizData={this.state.theirAudioVizData} color='#388e3c'/></div>
                <Typography component="p">
                  Status: {this.state.theirStatusText}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <MultilineOutput socket={this.state.socket} username={this.state.username}/>
          </Grid>
        </Grid>
      </React.Fragment>
    );
  }
}

CCConversation.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(CCConversation);
