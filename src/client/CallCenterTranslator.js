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
import MenuList from '@material-ui/core/MenuList';
import MenuItem from '@material-ui/core/MenuItem';
import MenuIcon from '@material-ui/icons/Menu';
import Typography from '@material-ui/core/Typography';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import Popper from '@material-ui/core/Popper';
import CallCenterLogin from './CallCenterLogin';
import CallCenterConversation from './CallCenterConversation';
import { socket } from './api';


const styles = theme => ({
  root: {
    display: 'flex',
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
  SettingsImg: {
    cursor:'pointer',
    float:'right',
    marginTop: '-7px',
    marginRight: '-5px',
    color: 'white',
  },
});



class CallCenterTranslator extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      currentFormNumber: 0,
      currentForm: <CallCenterLogin socket={socket}/>,
      settingsButton: '',
      titleSpacing: '',
      open: false,
    };
  }

  handleToggle = () => {
    this.setState({ open: !this.state.open });
    console.log("open " + this.state.open);
  };
  handleMenuClose = event => {
    if (this.anchorEl.contains(event.target)) {
      return;
    }
    this.setState({ open: false });
    console.log("open " + this.state.close);
  };

  handleClose = () => {
    this.setState({ open: false });
    socket.emit("leaveCall", true);
  };
  componentDidMount() {
    const { classes } = this.props;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    socket.on("resetTranslator", (data) => {
      this.setState({
        open: false,
        currentFormNumber: 0,
        currentForm: <CallCenterLogin socket={socket}/>,
        settingsButton: '',
        titleSpacing: '',
      });
    });
    socket.on("loginToCall", (data) => {
      this.setState({
        open: false,
        currentFormNumber: 1,
        currentForm: <CallCenterConversation socket={socket} audioContext={this.audioContext}/>,
        settingsButton: '',
        titleSpacing: '\u00A0\u00A0\u00A0\u00A0\u00A0',
      });
    });
  }
  componentWillUnmount() {
    socket.off("resetTranslator");
    socket.off("loginToCall");
  }
  startOver = () => {
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
                <IconButton
                  buttonRef={node => {
                    this.anchorEl = node;
                  }}
                  aria-owns={this.state.open ? 'translator-menu' : undefined}
                  aria-haspopup="true"
                  onClick={this.handleToggle}
                  className={classes.SettingsImg}>
                  <MenuIcon />
                </IconButton>
                <Popper open={this.state.open} anchorEl={this.anchorEl} transition disablePortal>
                  {({ TransitionProps, placement }) => (
                    <Grow
                      {...TransitionProps}
                      id="translator-menu"
                      style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                    >
                      <Paper>
                        <ClickAwayListener onClickAway={this.handleMenuClose}>
                          <MenuList>
                            {this.state.currentFormNumber ? <MenuItem onClick={this.handleClose}>Leave Call</MenuItem> : undefined}
                            <MenuItem onClick={this.startOver}>Reset Call</MenuItem>
                          </MenuList>
                        </ClickAwayListener>
                      </Paper>
                    </Grow>
                  )}
                </Popper>
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
