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
  card: {
    maxWidth: 200,
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
  statusList: {
    align: 'center',
    paddingTop: '0px',
    marginTop: '0px'
  },
  clientSelected: {
    backgroundColor: "#ce93d8 !important",
  },
  agentSelected: {
    backgroundColor: "#ce93d8 !important",
  }
});

class CCConversation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      audio: false,
      theirAudio: false,
      socket: this.props.socket,
      micText: 'Click to Speak',
      username: '',
      myUsername: '',
      myAvatar: '',
      myLanguage: '',
      theirUsername: '',
      theirAvatar: '',
      theirLanguage: '',
      started: false,
      reset: 0,
      audioVizData: new Uint8Array(0),
      theirAudioVizData: new Uint8Array(0),
      selectedIndex: -1,
      recordingDisabled: false,
    };
    this.toggleListen = this.toggleListen.bind(this);
    this.playAudioBuffer = this.playAudioBuffer.bind(this);
    this.tick = this.tick.bind(this);
  }

  componentDidMount() {

    this.state.socket.emit("getUsername", true);
    this.state.socket.on("myUsernameIs", (data) => {

      if(data.username=="agent"){
        this.setState({
          username: 'agent',
          myUsername: 'Agent (you)',
          myAvatar: <HeadsetIcon/>,
          myLanguage: data.language,
          theirUsername: 'Client',
          theirAvatar: <PersonIcon/>,
          theirLanguage: data.otherLanguage,
          agentColor: 'primary',
          clientColor: 'secondary'
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
          agentColor: 'secondary',
          clientColor: 'primary'
        });
      }
    });
    this.state.socket.on("theirAudioVizData", (b) => {
      var uint8Arr = new Uint8Array(b.buffer);
      this.setState({theirAudioVizData: uint8Arr});
    });
    this.state.socket.on("allStatus", (status) => {
      if(!this.state.theirLanguage){
        status = 'open';
      }
      if(status=='open'){
        this.setState({recordingDisabled: false});
      }
      else if(!this.state.audio){
        this.setState({recordingDisabled: true});
      }
      console.log("status " + status);
      this.setState({selectedIndex: status});
    });
    this.state.socket.on("stopRecording", (data) => {
      this.stopListening();
    });
    this.state.socket.on("updateYourself", (status) => {
      this.state.socket.emit("getUsername", true);
    });
    this.state.socket.on('audiodata', (data) => {
      //this.stopListening();
      this.playAudioBuffer(data, this.props.audioContext, true);
    });
  }

  componentWillUnmount() {
    this.stopListening();
    if(this.props.audioContext){
      this.props.audioContext.close();
    }
    this.state.socket.off("audiodata");
    this.state.socket.off("myUsernameIs");
    this.state.socket.off("theirAudioVizData");
    this.state.socket.off("theirStatus");
    this.state.socket.off("myStatus");
  }

  startListening(){

    if(!this.state.audio){
      startStreaming(this.props.audioContext);
      this.rafId = requestAnimationFrame(this.tick);
      this.dataArray = new Uint8Array(0);
      this.setState({audio: true, started: true});
    }
  }

  tick() {
    let audioVizData = new Uint8Array(0);
    if (!this.state.audio){
      //console.log("not audio viz started");
      animatedStreaming(this.props.audioContext, this.state.audio);
      this.setState({audio: true, started: true, myStatusText: "Microphone On" });
    }
    else{
      //console.log("audio viz already happeneing");
      audioVizData = animatedStreaming(this.props.audioContext, this.state.audio);
      this.setState({audio: true, started: true, audioVizData: audioVizData });
      let audioVizBuffer = audioVizData.buffer;
      this.state.socket.emit("myAudioVizData", audioVizBuffer);
    }

    this.rafId = requestAnimationFrame(this.tick);
  }
  stopListening(){
    if(this.state.audio){
      cancelAnimationFrame(this.rafId);
      stopStreaming(this.props.audioContext);
      this.setState({audio: false, myStatusText: 'Microphone Off'});
    }
  }
  toggleListen() {
    if (!this.state.started) {

      console.log("stop that stuff not started");
      this.setState({micText: 'Click to Speak', started: true});
    }
    if (this.state.audio) {
      console.log("force final and stop");
      this.state.socket.emit('forceFinal', true);
      this.stopListening();
    } else {
      console.log("starting to listen");
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
        try {
          source = context.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = false;
          source.connect(context.destination);
          source.start(0);
          active_source = true;
          source.onended = (event) => {
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
          <Grid item xs={4}>
            <Card className={classes.card}>
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

            </Card>
          </Grid>
          <Grid item xs={4}>

              <List dense>
                <ListItem selected={this.state.selectedIndex === 'agent speaking'} classes={{selected: classes.agentSelected}}>
                  <Paper elevation={2} className={classes.paper}>
                    <Typography align="center" color={this.state.agentColor} className={classes.statusList}>Agent Speaking</Typography>
                  </Paper>
                </ListItem>
                <ListItem selected={this.state.selectedIndex === 'agent processing'} classes={{selected: classes.agentSelected}}>
                  <Paper elevation={2} className={classes.paper}>
                    <Typography align="center" color={this.state.agentColor} className={classes.statusList}>Agent Processing</Typography>
                  </Paper>
                </ListItem>
                <ListItem selected={this.state.selectedIndex === 'agent playback'} classes={{selected: classes.agentSelected}}>
                  <Paper elevation={2} className={classes.paper}>
                    <Typography align="center" color={this.state.agentColor} className={classes.statusList}>Agent Playback</Typography>
                  </Paper>
                </ListItem>
                <ListItem selected={this.state.selectedIndex === 'client speaking'} classes={{selected: classes.clientSelected}}>
                  <Paper elevation={2} className={classes.paper}>
                    <Typography align="center" color={this.state.clientColor} className={classes.statusList}>Client Speaking</Typography>
                  </Paper>
                </ListItem>
                <ListItem selected={this.state.selectedIndex === 'client processing'} classes={{selected: classes.clientSelected}}>
                  <Paper elevation={2} className={classes.paper}>
                    <Typography align="center" color={this.state.clientColor} className={classes.statusList}>Client Processing</Typography>
                  </Paper>
                </ListItem>
                <ListItem selected={this.state.selectedIndex === 'client playback'} classes={{selected: classes.clientSelected}}>
                  <Paper elevation={2} className={classes.paper}>
                    <Typography align="center" color={this.state.clientColor} className={classes.statusList}>Client Playback</Typography>
                  </Paper>
                </ListItem>
              </List>
          </Grid>
          <Grid item xs={4}>
            <Card className={classes.card}>
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
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" className={classes.button} color={this.state.audio ? 'secondary' : 'primary'} onClick={this.toggleListen} disabled={this.state.recordingDisabled} >{this.state.audio ? 'Mic Active' : this.state.micText}</Button>
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
