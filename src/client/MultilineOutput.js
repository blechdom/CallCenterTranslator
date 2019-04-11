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
  }
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

  componentDidUpdate() {
    this.scrollToBottom();
    if(this.state.username != this.props.username) {
      //console.log("output knows i am " + this.props.username);
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
    socket.off("getTheirTranslation");
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
