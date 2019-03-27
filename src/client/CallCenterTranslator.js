import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@material-ui/core/styles/withStyles';
import CssBaseline from '@material-ui/core/CssBaseline';
import Toolbar from '@material-ui/core/Toolbar';
import Paper from '@material-ui/core/Paper';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import SettingsIcon from '@material-ui/icons/Settings';
import Typography from '@material-ui/core/Typography';
import CallCenterLogin from './CallCenterLogin';
import CallCenterConversation from './CallCenterConversation';
import { socket } from './api';


const styles = theme => ({
  root: {
      flexGrow: 1,
  },

  title: {
    padding: theme.spacing.unit * 2,
     color: 'white',
  },
  layout: {
    width: 'auto',
    marginLeft: theme.spacing.unit * 2,
    marginRight: theme.spacing.unit * 2,
    [theme.breakpoints.up(720 + theme.spacing.unit * 2 * 2)]: {
      width: 720,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
  },
  paper: {
    marginTop: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3,
    [theme.breakpoints.up(720 + theme.spacing.unit * 3 * 2)]: {
      marginTop: theme.spacing.unit * 6,
      marginBottom: theme.spacing.unit * 6,
    },
    minWidth: 300,
  },
  form: {
    padding: theme.spacing.unit * 2,
    [theme.breakpoints.up(720 + theme.spacing.unit * 3 * 2)]: {
      padding: theme.spacing.unit * 3,
    },
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  button: {
    //marginTop: theme.spacing.unit * 3,
    //marginLeft: theme.spacing.unit,
  },
  ResetImg: {
    cursor:'pointer',
    float:'right',
    marginTop: '-9px',
    marginRight: '-5px',
    color: 'white',
  },
});



class CallCenterTranslator extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      currentForm: <CallCenterLogin socket={socket}/>,
      settingsButton: '',
      titleSpacing: '',
    };
  }
  componentDidMount() {
    const { classes } = this.props;
    socket.on("resetTranslator", (data) => {
      this.setState({
        currentForm: <CallCenterLogin socket={socket}/>,
        settingsButton: '',
        titleSpacing: '',
      })
    });
    socket.on("loginToCall", (data) => {
      this.setState({
        currentForm: <CallCenterConversation socket={socket}/>,
        settingsButton: <IconButton
                          aria-label="Call Settings"
                          onClick={this.startOver} disabled={this.state.agentDisabled} className={classes.ResetImg} p={-2} m={-2} size="small">
                          <SettingsIcon p={-2} m={-2}/>
                        </IconButton>,
        titleSpacing: '\u00A0\u00A0\u00A0\u00A0\u00A0',
      });
    });
  }
  componentWillUnmount() {
    socket.off("resetTranslator");
    socket.off("loginToCall");
  }
  startOver(){
    console.log("resetting call");
    socket.emit("resetCall", true);
  }

  render() {
    const { classes } = this.props;

    return (
      <React.Fragment>
        <CssBaseline />
        <main className={classes.layout}>
          <Paper className={classes.paper}>
            <AppBar position="static">
              <Typography component="h1" variant="h4" className={classes.title} align="center" p={0}>
                {this.state.titleSpacing}
                Call Center Translator
                {this.state.settingsButton}
              </Typography>
            </AppBar>
            <React.Fragment>
              <div className={classes.form}>
                {this.state.currentForm}
              </div>
            </React.Fragment>
          </Paper>
        </main>
      </React.Fragment>
    );
  }
}

CallCenterTranslator.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(CallCenterTranslator);
