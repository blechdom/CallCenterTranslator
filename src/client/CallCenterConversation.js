import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@material-ui/core/styles/withStyles';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import MultilineOutput from './MultilineOutput';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardMedia from '@material-ui/core/CardMedia';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Avatar from '@material-ui/core/Avatar';
import HeadsetIcon from '@material-ui/icons/HeadsetMicTwoTone';
import PersonIcon from '@material-ui/icons/PersonOutlineTwoTone';
import AudioVisualiser from './AudioVisualiser';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { startStreaming, stopStreaming, animatedStreaming } from './AudioUtils';

let source = null;
let audioBuffer = null;
let active_source = false;

const styles = theme => ({
  unselected: {
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  selected: {
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#FFCCCC',
  },
  myAvatar: {
    color: '#FFFFFF',
    backgroundColor: '#2196f3',
  },
  theirAvatar: {
    color: '#FFFFFF',
    backgroundColor: '#388e3c',
  },
  paper: {
    width: '98%',
    align: 'center',
    paddingTop: '0px',
    marginTop: '0px'
  },
  button: {
    width:'98%',
    align: 'center',
  },
  status: {
    align: 'center',
  },
});

class CCConversation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      audio: false,
      socket: this.props.socket,
      micText: 'Push To Talk',
      username: '',
      userChar: '',
      myUsername: '',
      myAvatar: '',
      myLanguage: '',
      theirUsername: '',
      theirAvatar: '',
      theirLanguage: 'UNAVAILABLE',
      started: false,
      reset: 0,
      audioVizData: new Uint8Array(0),
      theirAudioVizData: new Uint8Array(0),
      selectedChar: '',
      recordingDisabled: false,
      numberOfUsers: 1,
      interactionMode: 'push-to-talk',
      interactionText: '',
      autoMute: true,
      approveText: false,
      myStatus: '',
      theirStatus: '',
      myCardSelected: false,
      theirCardSelected: false
    };
    this.toggleListen = this.toggleListen.bind(this);
    this.playAudioBuffer = this.playAudioBuffer.bind(this);
    this.tick = this.tick.bind(this);
  }

  componentDidMount() {

    this.state.socket.emit("getUsername", true);

    this.state.socket.on("myUsernameIs", (data) => {
      let theirLanguage = '';
      let interactionText = '';
      if(data.interactionMode == 'push-to-talk'){
        interactionText = "Push To Talk Mode";
        if(data.approveText){
          interactionText = interactionText + " (with text approval)";
        }
      }
      else {
        interactionText = "Continuous Conversation Mode";
        if(data.autoMute){
          interactionText = interactionText + " (with Automatic Muting)";
        }
      }
      if (!data.otherLanguage) {
        theirLanguage = 'UNAVAILABLE';
        this.setState({
          recordingDisabled: true,
          micText: 'WAITING FOR OTHER CALLER',
          myStatus: "Waiting",
          theirStatus: 'Unavailable',
          myCardSelected: false,
          theirCardSelected: false
        });
      }
      else {
        theirLanguage = data.otherLanguage;
        this.setState({
          recordingDisabled: false,
          micText: 'PUSH TO TALK',
          myStatus: 'READY',
          theirStatus: 'READY',
          myCardSelected: false,
          theirCardSelected: false
        });
      }

      if(data.username=="agent"){
        this.setState({
          username: 'agent',
          userChar: 'a',
          myUsername: 'Agent (you)',
          myAvatar: <HeadsetIcon/>,
          myLanguage: data.language,
          theirUsername: 'Client',
          theirUserChar: 'c',
          theirAvatar: <PersonIcon/>,
          theirLanguage: theirLanguage,
          agentColor: 'primary',
          clientColor: 'secondary',
          interactionMode: data.interactionMode,
          interactionText: interactionText,
          autoMute: data.autoMute,
          approveText: data.approveText,
        });
      }
      else{
        this.setState({
          username: 'client',
          userChar: 'c',
          myUsername: 'Client (you)',
          myAvatar: <PersonIcon/>,
          myLanguage: data.language,
          theirUsername: 'Agent',
          theirUserChar: 'a',
          theirAvatar: <HeadsetIcon/>,
          theirLanguage: theirLanguage,
          agentColor: 'secondary',
          clientColor: 'primary',
          interactionMode: data.interactionMode,
          interactionText: interactionText,
          autoMute: data.autoMute,
          approveText: data.approveText,
        });
      }
    });
    this.state.socket.on("theirAudioVizData", (b) => {
      var uint8Arr = new Uint8Array(b.buffer);
      this.setState({theirAudioVizData: uint8Arr});
    });
    this.state.socket.on("allStatus", (status) => {
      console.log("status: " + status);
      if(!this.state.theirLanguage){
        status = 'open';
      }
      if(status=='open'){
        this.setState({
          recordingDisabled: false,
          micText: 'PUSH TO TALK',
          myCardSelected: false,
          theirCardSelected: false,
        });
      }
      else if(!this.state.audio && (this.state.interactionMode=='push-to-talk')){
        this.setState({
          recordingDisabled: true,
          micText: 'UNAVAILABLE',
          myCardSelected: false,
        });
      }
      if((status=='open') && (this.state.interactionMode=='push-to-talk')){
        this.setState({
          myStatus: 'Microphone Available',
          theirStatus: 'Microphone Available',
          myCardSelected: false,
          theirCardSelected: false,
        });
      }
      else if(status.charAt(0)==this.state.userChar){
        this.setState({
          myStatus: status,
          selectedChar: status.charAt(0),
          myCardSelected: true,
        });
        if(this.state.interactionMode=='push-to-talk'){
          let theirStatus = "Waiting";
          if(status.endsWith("playback")){
            theirStatus = "Listening";
          }
          this.setState({
            theirStatus: theirStatus,
          });
        }
      }
      else if(status.charAt(0)==this.state.theirUserChar){
        this.setState({
          theirStatus: status,
          selectedChar: status.charAt(0),
          theirCardSelected: true,
        });
        if(this.state.interactionMode=='push-to-talk'){
          let myStatus = "Waiting";
          if(status.endsWith("playback")){
            myStatus = "Listening";
          }
          this.setState({
            myStatus: myStatus,
          });
        }
      }

    });
    this.state.socket.on("stopRecording", (data) => {
      //console.log("push-to-talk stopped mic");
      this.stopListening();
    });
    this.state.socket.on("updateYourself", (numberOfUsers) => {
      //console.log("updating if number changes " + numberOfUsers);

      if(this.state.numberOfUsers!==numberOfUsers) {
        this.state.socket.emit("getUsername", true);

      }

        this.setState({numberOfUsers: numberOfUsers});


    });
    this.state.socket.on('audiodata', (data) => {
      if(!this.state.started){
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        //this.setState({started:true});
      }
      this.playAudioBuffer(data, this.audioContext, true);
    });
    this.state.socket.on('callerChange', (data) => {
      if (!this.state.theirLanguage){
        //console.log("waiting for other caller");
        this.setState({
          myStatus: "waiting for caller",
          recordingDisabled: true,
          micText: 'WAITING FOR OTHER CALLER'
        });

      }
      else {
        this.setState({
          recordingDisabled: false,
          micText: 'PUSH TO TALK'
        });
      }
    });
  }

  componentWillUnmount() {
    this.stopListening();
    if(this.audioContext){
      this.audioContext.close();
    }
    this.state.socket.off("audiodata");
    this.state.socket.off("myUsernameIs");
    this.state.socket.off("theirAudioVizData");
    this.state.socket.off("allStatus");
    this.state.socket.off("updateYourself");
    this.state.socket.off("stopRecording");
  }

  startListening(){
    if(!this.state.started){
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.setState({started:true});
    }
    if(!this.state.audio){
      startStreaming(this.audioContext);
      this.rafId = requestAnimationFrame(this.tick);
      this.dataArray = new Uint8Array(0);
      this.setState({
        audio: true,
        started: true,
      });
      if(this.state.interactionMode=='push-to-talk'){
        this.setState({
          theirStatus: 'Waiting'
        });
      }
    }
  }


  tick() {
    let audioVizData = new Uint8Array(0);
    if (!this.state.audio){
      //console.log("not audio viz started");
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
      stopStreaming(this.audioContext);
      this.setState({audio: false, myStatusText: 'Microphone Off'});
    }
  }
  toggleListen() {
    if (!this.state.started) {
      this.setState({
        micText: 'Push To Talk',
        started: true,
      });
      this.state.socket.emit("clearTextBuffers", true);
    }
    if (this.state.audio) {

      this.state.socket.emit('forceFinal', true);
      this.stopListening();
      this.setState({started: false});

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
    if(this.state.autoMute){
      //console.log("auto-muting now");
      this.stopListening();
    }

    context.decodeAudioData(audioFromString, (buffer) => {
        active_source = true;
        audioBuffer = buffer;
        try {
          source = context.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = false;
          source.connect(context.destination);
          source.start(0);
          active_source = true;
          source.onended = (event) => {

            if(this.state.autoMute && this.state.started && (this.state.interactionMode=='continuous')){
              //console.log("auto-unmuting now");
              this.startListening();
            }
            this.state.socket.emit("audioPlaybackComplete", true);
          };
        } catch (e) {
          console.error(e);
        }


    }, function (e) {
        console.log('Error decoding file', e);
    });
  }
  render(){
    const { classes } = this.props;

    return (
      <React.Fragment>
        <Grid container spacing={8}>
          <Grid item xs={12}>
            <Typography align="center" variant="button">{this.state.interactionText}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Card className={(this.state.myCardSelected  && (this.state.interactionMode=='push-to-talk'))? classes.selected : classes.unselected}>
              <CardHeader
                avatar={
                  <Avatar aria-label="Chat-Role" className={classes.myAvatar}>
                    {this.state.myAvatar}
                  </Avatar>
                }
                title={this.state.myUsername}
                subheader={this.state.myLanguage}
              />
              <CardContent>
                <div align="center" style={{ marginLeft: -16}} ><AudioVisualiser audioVizData={this.state.audioVizData} color='#1976d2'/></div>
              </CardContent>
              {this.state.interactionMode=='push-to-talk' ?
                <Typography align="center" color="primary" variant="button">{this.state.myStatus}</Typography>
              : ''}
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card className={(this.state.theirCardSelected  && (this.state.interactionMode=='push-to-talk')) ? classes.selected : classes.unselected}>
              <CardHeader
                avatar={
                  <Avatar aria-label="Chat-Role" className={classes.theirAvatar}>
                    {this.state.theirAvatar}
                  </Avatar>
                }
                title={this.state.theirUsername}
                subheader={this.state.theirLanguage}
              />
              <CardContent>
                <div align="center" style={{ marginLeft: -16}}><AudioVisualiser audioVizData={this.state.theirAudioVizData} color='#388e3c'/></div>
              </CardContent>
              {this.state.interactionMode=='push-to-talk' ?
                <Typography align="center" color="secondary" variant="button">{this.state.theirStatus}</Typography>
              : ''}
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              className={classes.button}
              color={this.state.audio ? 'secondary' : 'primary'}
              onClick={this.toggleListen}
              disabled={this.state.recordingDisabled}
            >
                {this.state.audio ? 'Mic Active' : this.state.micText}
            </Button>
          </Grid>
          <Grid item xs={12}>
            <MultilineOutput socket={this.state.socket} username={this.state.username} approveText={this.state.approveText}/>
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
