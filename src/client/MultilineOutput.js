import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import HeadsetIcon from '@material-ui/icons/HeadsetMicTwoTone';
import PersonIcon from '@material-ui/icons/PersonOutlineTwoTone';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Icon from '@material-ui/core/Icon';


const styles = theme => ({
  paper: {
    flexGrow: 1,
    height: '40vh',
  	overflowY: 'scroll',
    margin: theme.spacing.unit * 2,
    padding: theme.spacing.unit * 2,
  },
  pendingText: {
    color: '#ee918d',
    float:"left",
    padding:"-6",
    margin:"-6",

  },
  finalText: {
    color: '#000000',
    float:"left",
    padding:"-6",
    margin:"-6",

  },
  translatedText: {
    color: '#b7e1cd',
    float: "right",
    padding:"-6",
    margin:"-6",
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
    };
  }

  componentDidMount() {
    const { classes } = this.props;

    let socket = this.props.socket;

      socket.on('getTranscript', (response) => {
        this.setState({newText: response.transcript});
        if (this.state.newText != undefined){
          this.setState({outputText:  <div>
                                        {this.state.concatText}
                                        <ListItem alignItems='flex-start' dense className={classes.pendingText}>
                                          <ListItemIcon>
                                            <Icon color='primary'>
                                              {this.state.userIcon}
                                            </Icon>
                                          </ListItemIcon>
                                          <ListItemText color='primary'>
                                            {this.state.newText}
                                          </ListItemText>
                                        </ListItem>
                                      </div>
          });
            if (response.isfinal){
            this.setState({
              isFinal: true,
              concatText: <div>
                            {this.state.concatText}
                            <ListItem alignItems='flex-start' dense color='primary'>
                              <ListItemIcon>
                                <Icon color='primary'>
                                  {this.state.userIcon}
                                </Icon>
                              </ListItemIcon>
                              <ListItemText color='primary'>
                                {this.state.newText}
                              </ListItemText>
                            </ListItem>
                          </div>,
            }, () => {
              this.setState({outputText: <div>{this.state.concatText}</div>

              });
            });
          }
        }
      });
      socket.on('getTranslation', (response) => {
        this.setState({
          concatText: <div>
                        {this.state.concatText}
                        <ListItem dense className={classes.translatedText}>
                          <ListItemSecondaryAction>
                            <ListItemText color='secondary'>
                              {response}
                            </ListItemText>

                              <Icon color='secondary'>
                                {this.state.otherUserIcon}
                              </Icon>

                          </ListItemSecondaryAction>
                        </ListItem>
                      </div>,
          outputText: <div>
                        {this.state.concatText}
                        <ListItem dense className={classes.translatedText}>
                          <ListItemSecondaryAction>
                            <ListItemText color='secondary'>
                              {response}
                            </ListItemText>

                              <Icon color='secondary'>
                                {this.state.otherUserIcon}
                              </Icon>

                          </ListItemSecondaryAction>
                        </ListItem>
                      </div>
        });
        this.setState({newTranslation: ''});
        this.setState({newText: ''});
        this.setState({isFinal: false});
      });
      this.scrollToBottom();
  }

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: "smooth" });
  }

  componentDidUpdate() {
    this.scrollToBottom();
    if(this.state.username != this.props.username) {
      console.log("output knows i am " + this.props.username);
      if(this.props.username=='client'){
        this.setState({
          username: this.props.username,
          userIcon: <PersonIcon />,
          otherUserIcon: <HeadsetIcon />
        });
      }
      else{
        this.setState({
          username: this.props.username,
          userIcon: <HeadsetIcon />,
          otherUserIcon: <PersonIcon />
        });
      }
    }
  }

  componentWillUnmount(){
    let socket = this.props.socket;
    socket.off("getTranscript");
    socket.off("getTranslation");
  }

  render() {
    const { classes } = this.props;

    return (
      <div>
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
