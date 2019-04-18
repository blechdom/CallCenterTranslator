import React from 'react';
import ReactDOM from 'react-dom';
import { createMuiTheme } from '@material-ui/core/styles';
import { MuiThemeProvider } from '@material-ui/core/styles';
import blue from '@material-ui/core/colors/blue';
import red from '@material-ui/core/colors/red';
import green from '@material-ui/core/colors/green';
import grey from '@material-ui/core/colors/grey';
import CallCenterTranslator from './CallCenterTranslator';

const theme = createMuiTheme({
  palette: {
    primary: blue,
    secondary: { light: green[300], main: green[500], dark: green[700] },
    error: grey
  },
  typography: {
      useNextVariants: true,
    },
});

ReactDOM.render(<MuiThemeProvider theme={theme}><CallCenterTranslator /></MuiThemeProvider>, document.getElementById('root'));
