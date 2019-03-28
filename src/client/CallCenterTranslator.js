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
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import MenuIcon from '@material-ui/icons/Menu';
import Typography from '@material-ui/core/Typography';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
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
      settingsOpen: false,
      anchorEl: null,
    };
  }
  handleClickOpen = () => {
    this.setState({ settingsOpen: true });
  };

  handleClickMenu = event => {
    this.setState({ anchorEl: event.currentTarget });
    console.log("open " + event.currentTarget);
  };
  handleMenuClose = event => {
    this.setState({ anchorEl: null });
    console.log("close " + event.currentTarget);
  };

  handleClose = () => {
    this.setState({ settingsOpen: false });
  };
  componentDidMount() {
    const { classes } = this.props;
    socket.on("resetTranslator", (data) => {
      this.setState({
        currentFormNumber: 0,
        currentForm: <CallCenterLogin socket={socket}/>,
        settingsButton: '',
        titleSpacing: '',
      })
    });
    socket.on("loginToCall", (data) => {
      this.setState({
        currentFormNumber: 1,
        currentForm: <CallCenterConversation socket={socket}/>,
        settingsButton: '',
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
                <IconButton
                  aria-owns={this.state.anchorEl ? 'simple-menu' : undefined}
                  aria-haspopup="true"
                  onClick={this.handleClickMenu}
                  className={classes.SettingsImg}>
                  <MenuIcon />
                </IconButton>
                <Menu
                  id="simple-menu"
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  open={Boolean(this.state.anchorEl)}
                  onClose={this.handleMenuClose}
                >
                  {this.state.currentFormNumber ? <MenuItem onClick={this.handleClose}>Leave Call</MenuItem> : undefined}
                  <MenuItem onClick={this.startOver}>Reset Call</MenuItem>
                  {this.state.currentFormNumber ? <MenuItem onClick={this.handleClickOpen}>Call Settings</MenuItem> : undefined}
                </Menu>
              </Typography>
            </AppBar>
            <React.Fragment>
              <div className={classes.form}>
                {this.state.currentForm}
              </div>
            </React.Fragment>
          </Paper>
          <Dialog
            open={this.state.settingsOpen}
            onClose={this.handleClose}
            aria-labelledby="form-dialog-title"
          >
            <DialogTitle id="form-dialog-title">Settings</DialogTitle>
            <DialogContent>
              <DialogContentText>
                To subscribe to this website, please enter your email address here. We will send
                updates occasionally.
              </DialogContentText>

            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleClose} color="primary">
                Cancel
              </Button>
              <Button onClick={this.handleClose} color="primary">
                Subscribe
              </Button>
            </DialogActions>
          </Dialog>
        </main>
      </React.Fragment>
    );
  }
}

CallCenterTranslator.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(CallCenterTranslator);
