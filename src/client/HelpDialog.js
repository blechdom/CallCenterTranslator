import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';

const styles = theme => ({
    formControl: {
      align: "center"
    },
    helpList: {
      paddingTop:theme.spacing.unit,
      paddingLeft:theme.spacing.unit * 3,
    }
});

class HelpDialog extends React.Component {

  handleClose = () => {
   this.props.onClose();
  };

  render() {
    const { classes, onClose, ...other } = this.props;

    return (
    <Dialog
      onClose={this.handleClose}
      aria-labelledby="form-dialog-title"
      {...other}
    >
      <DialogContent>
        <Typography variant='h6' color="primary">Continuous Conversation Mode</Typography>
        <Typography variant='caption' className={classes.helpList}>
          &#8226; headset recommended, unless auto-mute enabled<br />
          &#8226; implements infinite streaming<br />
          &#8226; both users must use the same mode<br />
          <br />
        </Typography>
        <Typography variant='h6' color="primary">Push-To-Talk Mode</Typography>
        <Typography variant='caption' className={classes.helpList}>
          &#8226; click required to start microphone before each utterance<br />
          &#8226; does not require a headset<br />
          &#8226; does not implement infinite streaming<br />
          &#8226; automatically stops microphone after each speech result<br />
          &#8226; microphone cannot start if other person is talking or being translated<br />
          &#8226; users must wait for open line before speaking<br />
          &#8226; users may say multiple statements in a row, if other user is not talking<br />
          &#8226; both users must use the same mode<br />
          <br />
        </Typography>
        <Typography variant='h6' color="primary">Auto-Mute Mic During Playback</Typography>
        <Typography variant='caption' className={classes.helpList}>
          &#8226; automatically mutes microphone input during audio playback<br />
          &#8226; automatically resumes microphone input after audio playback is complete<br />
          &#8226; headset not required<br />
          &#8226; reduces feedback between audio playback and microphone input<br />
          &#8226; each user can have a different auto-mute setting<br />
          &#8226; only an option for Continuous Conversation Mode<br />
          <br />
        </Typography>
        <Typography variant='h6' color="primary">Approve Text Before Sending</Typography>
        <Typography variant='caption' className={classes.helpList}>
          &#8226; provides 2 buttons for approving or rejecting speech-to-text results<br />
          &#8226; CANCEL: deletes most recent transcription before sending to other user<br />
          &#8226; SEND: sends most recent transcription to other user<br />
          &#8226; allows user to only send accurate transcriptions<br />
          &#8226; each user can have a different text approval setting<br />
          &#8226; only an option for Push-To-Talk Mode<br />
          <br />
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={this.handleClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
    );
  }
}

HelpDialog.propTypes = {
  classes: PropTypes.object.isRequired,
  onClose: PropTypes.func,
};

export default withStyles(styles)(HelpDialog);
