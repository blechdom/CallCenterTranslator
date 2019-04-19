import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import SendIcon from '@material-ui/icons/SendRounded';
import CancelIcon from '@material-ui/icons/CancelOutlined';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import InputBase from '@material-ui/core/InputBase';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';

const styles = theme => ({
  paper: {
    flexGrow: 1,
    height: '40vh',
  	overflowY: 'scroll',
    margin: theme.spacing.unit,
    padding: theme.spacing.unit,
  },
  pendingPrimary: {
    color: '#90caf9',
  },
  pendingSecondary: {
    color: '#81c784',
  },
  alignRight: {
    textAlign: 'right'
  },
  root: {
    margin: theme.spacing.unit,

    display: 'flex',
  },
  input: {
    color: '#2196f3',
    margin: 8,
    marginLeft: 16,
    flex: 1,
  },
  pendingInput: {
    color: '#90caf9',
    margin: 8,
    marginLeft: 16,
    flex: 1,
  },
  iconButton: {
    padding: 10,
  },
  divider: {
    width: 1,
    height: 28,
    margin: 4,
  },
});

class MultilineOutput extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      multiline: 'Controlled',
      outputText: '',
      newText: '',
      newTranslation: '',
      concatText: '',
      isFinal: false,
      userIcon: '',
      otherUserIcon: '',
      username: '',
      textToApprove: '',
    };
  }

  componentDidMount() {
    const { classes } = this.props;

    let socket = this.props.socket;
      socket.on('textNeedsApproval', (response) => {
        this.setState({textToApprove: response.transcript,
        isFinal: response.isfinal});

      });
      socket.on('getTranscript', (response) => {
        this.setState({newText: response.transcript});
        if (this.state.newText != undefined){
          this.setState({
            outputText:  <div>
                          {this.state.concatText}
                          <ListItem alignItems='flex-start' dense>
                            <ListItemText
                              primary={
                                <Typography className={classes.pendingPrimary} variant="h6">
                                  {response.transcript}
                                </Typography>
                              }
                              secondary={
                                <Typography className={classes.pendingSecondary} variant="subtitle1">
                                  {response.translation}
                                </Typography>
                            } />
                          </ListItem>
                        </div>
          });
            if (response.isfinal){
            this.setState({
              isFinal: true,
              concatText: <div>
                            {this.state.concatText}
                            <ListItem alignItems='flex-start' dense>
                              <ListItemText
                                primary={
                                  <Typography color="primary" variant="h6">
                                    {response.transcript}
                                  </Typography>
                                }
                                secondary={
                                  <Typography color="secondary" variant="subtitle1">
                                    {response.translation}
                                  </Typography>
                              } />
                            </ListItem>
                          </div>,
            }, () => {
              this.setState({outputText: <div>{this.state.concatText}</div>

              });
            });
          }
        }
      });
      socket.on('getTheirTranslation', (response) => {
        //console.log(JSON.stringify(response));
        this.setState({newTranslation: response.transcript});
        if (this.state.newTranslation != undefined){
        this.setState({
          outputText: <div>
                        {this.state.concatText}
                        <ListItem dense>
                          <ListItemText
                            primary={
                              <Typography className={`${classes.pendingSecondary} ${classes.alignRight}`} variant="h6">
                                {response.transcript}
                              </Typography>
                            }
                            secondary={
                              <Typography className={`${classes.pendingPrimary} ${classes.alignRight}`} variant="subtitle1">
                                {response.translation}
                              </Typography>
                          } />
                        </ListItem>
                      </div>
        });
        if (response.isfinal){
            this.setState({
            isFinal: true,
            concatText: <div>
                          {this.state.concatText}
                          <ListItem dense>
                            <ListItemText
                              primary={
                                <Typography color="secondary" className={classes.alignRight} variant="h6">
                                  {response.transcript}
                                </Typography>
                              }
                              secondary={
                                <Typography color="primary" className={classes.alignRight} variant="subtitle1">
                                  {response.translation}
                                </Typography>
                            } />
                          </ListItem>
                        </div>,
          }, () => {
            this.setState({outputText: <div>{this.state.concatText}</div>

            });
          });
        }
      }
    });
    this.scrollToBottom();
  }

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: "smooth" });
  }
  cancelText = () => {
    this.setState({textToApprove: ''});
  }
  approveText = () => {
    let socket = this.props.socket;
    socket.emit("translateAndSendThisText", this.state.textToApprove);
    this.setState({textToApprove: ''});
  }

  componentDidUpdate() {
    this.scrollToBottom();
    if(this.state.username != this.props.username) {
      //console.log("output knows i am " + this.props.username);
      if(this.props.username=='client'){
        this.setState({
          username: this.props.username,
        });
      }
      else{
        this.setState({
          username: this.props.username,
        });
      }
    }
  }

  componentWillUnmount(){
    let socket = this.props.socket;
    socket.off("getTranscript");
    socket.off("getTheirTranslation");
  }

  render() {
    const { classes } = this.props;

    return (
      <div>
        {this.props.approveText?
          <Paper elevation={1} className={classes.root} id="TextForApproval" ref="TextForApproval">
            <Typography variant="subtitle1" className={this.state.isFinal ? classes.input : classes.pendingInput }>
              {this.state.textToApprove}
            </Typography>
            <Divider className={classes.divider} />
            <IconButton className={classes.iconButton} onClick={this.cancelText} aria-label="Search">
              <CancelIcon />
            </IconButton>
            <Divider className={classes.divider} />
            <IconButton color="primary" className={classes.iconButton} onClick={this.approveText} aria-label="Directions">
              <SendIcon />
            </IconButton>
          </Paper>
        : ''}
        <Paper elevation={1} className={classes.paper} id="Transcript" ref="Transcript">
            <List>
              {this.state.outputText}
            </List>
            <div style={{ float:"left", clear: "both" }} ref={(el) => { this.messagesEnd = el; }}>
            </div>
        </Paper>

      </div>

    );
  }
}

MultilineOutput.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MultilineOutput);
