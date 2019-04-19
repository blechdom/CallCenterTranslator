import React from 'react';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import LanguageSelects from './LanguageSelects';
import Button from '@material-ui/core/Button';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import HeadsetIcon from '@material-ui/icons/HeadsetMicTwoTone';
import PersonIcon from '@material-ui/icons/PersonOutlineTwoTone';
import withStyles from '@material-ui/core/styles/withStyles';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Input from '@material-ui/core/Input';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';
import InfoIcon from '@material-ui/icons/InfoOutlined';
import HelpDialog from './HelpDialog';
import { setInteractionMode, setAutoMute, setApproveText } from './api';


const styles = theme => ({
  root: {
      flexGrow: 1,
      justifyContent: 'center',
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 260,
  },
  checkbox: {
    minWidth: 260,
  },
  greyedOut: {
    color: '#333333'
  }
});

class CallCenterLogin extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      socket: this.props.socket,
      agentDisabled: false,
      clientDisabled: false,
      interactionMode: 'push-to-talk',
      interactionDisabled: false,
      textApprovalRequired: false,
      approvalDisabled: false,
      muteOnPlayback: true,
      muteDisabled: true,
      helpOpen: false,
    };
    this.agentLogin = this.agentLogin.bind(this);
    this.clientLogin = this.clientLogin.bind(this);
  }
  handleHelpOpen = () => {
    this.setState({helpOpen:true});
  }
  handleHelpClose = () => {
      this.setState({helpOpen:false});
  }
  handleModeChange = (event) => {
    //console.log(event.target.value);
    this.setState({ interactionMode: event.target.value }, () => setInteractionMode(this.state.interactionMode));
    if(event.target.value=='continuous'){
      this.setState({
        muteOnPlayback: true,
        muteDisabled: false,
        approvalDisabled: true,
        textApprovalRequired: false,
      });
    }
    else {
      this.setState({
        muteOnPlayback: true,
        muteDisabled: true,
        approvalDisabled: false,
        textApprovalRequired: false,
      });
    }
  }
  handleAutoMuteCheckbox = (event) => {
      this.setState({ muteOnPlayback: event.target.checked }, () => setAutoMute(this.state.muteOnPlayback));
    };
  handleTextApprovalCheckbox = (event) => {
      this.setState({ textApprovalRequired: event.target.checked }, () => setApproveText(this.state.textApprovalRequired));
    };
  componentDidMount() {
    setInteractionMode(this.state.interactionMode);

    this.state.socket.emit("getAvailableRoles", true);


    this.state.socket.on("availableRoles", (roles) => {
      this.setState({
        agentDisabled:false,
        clientDisabled:false
      })
      //console.log("in available roles");
      for(var i in roles){
        //console.log("roles: " + roles[i]);
        if (roles[i]=="agent"){
          this.setState({agentDisabled:true});
        }
        else if(roles[i]=="client"){
          this.setState({clientDisabled:true});
        }
      }

    });
    this.state.socket.on("resetLogin", (data) => {
      this.state.socket.emit("resetMyData", true);
    });
    this.state.socket.on("getInteractionMode", (data) => {
      //console.log("current Interaction " + data);
      if (data=="enable"){
        this.setState({  interactionDisabled: false  });
      }
      else if(data=='continuous'){
        this.setState({
          interactionMode: data,
          interactionDisabled: true,
          muteOnPlayback: true,
          muteDisabled: false,
          approvalDisabled: true,
          textApprovalRequired: false,
        });
      }
      else if (data=='push-to-talk'){
        this.setState({
          interactionMode: data,
          interactionDisabled: true,
          muteOnPlayback: true,
          muteDisabled: true,
          approvalDisabled: false,
          textApprovalRequired: false,
        });
      }

    });
  }
  componentWillUnmount() {
    this.state.socket.off("resetLogin");
    this.state.socket.off("availableRoles");
    this.state.socket.off("getInteractionMode");
  }
  agentLogin() {
    //console.log("logging in as agent");
    this.state.socket.emit("joinCall", "agent");
  }
  clientLogin() {
    //console.log("logging in as client");
    this.state.socket.emit("joinCall", "client");
  }
  render(){
    const { classes } = this.props;

    return (
      <React.Fragment>
        <Grid
        item
          container
          direction="row"
          justify="center"
          alignItems="center"
          alignContent="center"
          spacing={8}>

          <Grid item xs={12}>
            <div align="center">
              <FormControl disabled={this.state.interactionDisabled}>
                <InputLabel htmlFor="interaction-select">Select Interaction Mode</InputLabel>
                <Select
                  native
                  value={this.state.interactionMode}
                  onChange={this.handleModeChange}
                  inputProps={{ name: "interaction-mode", id: "interaction-select", }}
                >
                  <option key="continuous" value="continuous">Continuous Conversation</option>
                  <option key="push-to-talk" value="push-to-talk">Push To Talk</option>
                </Select>
              </FormControl>
              <IconButton aria-label="Help Popup" onClick={this.handleHelpOpen} color='primary'>
                <InfoIcon/>
              </IconButton>
            </div>
          </Grid>
          <Grid item xs={12}>
            <div align="center">
              <FormGroup>
                <FormControlLabel className={classes.checkbox}
                  control={
                    <Checkbox
                      disabled = {this.state.muteDisabled}
                      checked={this.state.muteOnPlayback}
                      onChange={this.handleAutoMuteCheckbox}
                      value="muteOnPlayback"
                      color="primary"
                    />
                  }
                  label="Auto-Mute Mic During Playback"
                />
                <FormControlLabel className={classes.checkbox}
                  control={
                    <Checkbox
                      disabled = {this.state.approvalDisabled}
                      checked={this.state.textApprovalRequired}
                      onChange={this.handleTextApprovalCheckbox}
                      value="textApprovalRequired"
                      color="primary"
                    />
                    }
                    label="Approve Text Before Sending"
                  />

              </FormGroup>
            </div>
          </Grid>
          <Grid item xs={12}>
            <div align="center">
              <LanguageSelects socket={this.state.socket} speechModel="true"/>
            </div>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h5" align="center">Login as...</Typography>
          </Grid>
          <Grid item xs={3}></Grid>
          <Grid item xs={3}>
            <div align="center">
              <IconButton aria-label="Agent Login" onClick={this.agentLogin} disabled={this.state.agentDisabled} color='primary'>
                <HeadsetIcon style={{ fontSize: 70 }}/>
              </IconButton>
              <Typography variant="h6" color={this.state.agentDisabled ? 'error' : 'primary'}>AGENT</Typography>
            </div>
              </Grid>
              <Grid item xs={3}>
            <div align="center">
              <IconButton aria-label="Client Login" label='client' onClick={this.clientLogin} disabled={this.state.clientDisabled} color='secondary'>
                <PersonIcon style={{ fontSize: 70 }}/>
              </IconButton>
              <Typography variant="h6" color={this.state.clientDisabled ? 'error' : 'secondary'}>CLIENT</Typography>
            </div>
          </Grid>
          <Grid item xs={3}></Grid>
        </Grid>
        <HelpDialog
          open={this.state.helpOpen}
          onClose={this.handleHelpClose}
        />
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(CallCenterLogin);
