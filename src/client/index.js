import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { createMuiTheme } from '@material-ui/core/styles';
import { MuiThemeProvider } from '@material-ui/core/styles';
import blue from '@material-ui/core/colors/blue';
import red from '@material-ui/core/colors/red';
import green from '@material-ui/core/colors/green';

const theme = createMuiTheme({
  palette: {
    primary: blue,
    secondary: { light: green[300], main: green[500], dark: green[700] }
  },
  typography: {
      useNextVariants: true,
    },
});

ReactDOM.render(<MuiThemeProvider theme={theme}><App /></MuiThemeProvider>, document.getElementById('root'));
