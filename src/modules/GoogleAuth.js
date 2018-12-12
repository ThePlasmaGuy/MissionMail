const electron = require('electron');
const {google} = require('googleapis');
const {promisify} = require('util');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Configuration Values
const SCOPES = ['profile', 'email', 'https://www.googleapis.com/auth/spreadsheets', 'https://mail.google.com/'];
const CREDENTIALS_FOLDER = '../google';

// Authorize Google & Call Specified Function with Authorized Client
exports.auth = (onAuthorized) => {
  fs.readFile(path.join(__dirname, CREDENTIALS_FOLDER, 'credentials.json'), (err, content) => {
    if (err) return console.log('ERROR loading client secret file:', err);

    const client = exports.createOAuthClient(content);

    // Check for previous token
    fs.readFile(path.join(__dirname, CREDENTIALS_FOLDER, 'token.txt'), "utf8", (err, token) => {
      if (err) { // Prompt Signin to Retrieve Tokens
        const auth_URL = client.generateAuthUrl({access_type: 'offline', scope: SCOPES});

        const callback_server = express(); // Server to catch callback code

        callback_server.get('/auth', (req, res) => { // redirect query
          const code = req.query.code; // callback code
          client.getToken(code, (err, tokens) => { // generate tokens
            if (err) return console.log('Error retrieving tokens', err);

            client.setCredentials({refresh_token: tokens.refresh_token}); // set refresh token
            
            res.send('Authentication Successful!  Closing Window...');
            authWindow.destroy();
            listener.close(); // close listener

            electron.app.relaunch();
            electron.app.exit(0);
            //onAuthorized(client); // Pass Client to authorized function
          });
        });
        const listener = callback_server.listen(2403); // Listen for redirect query
        
        // Create Browser Window and direct to auth_URL
        const authWindow = new electron.BrowserWindow({center:true,show:true,resizable:false,webPreferences:{nodeIntegration:false}});
        authWindow.loadURL(auth_URL);
      } else { // refresh token previously saved
        client.setCredentials({refresh_token: token}); // set refresh token
        onAuthorized(client);
      }
    });
  });
}

exports.createOAuthClient = (credentials) => {
  const {client_id, client_secret} = JSON.parse(credentials).installed;
  const client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:2403/auth');

  client.on('tokens', (tokens) => { // Bind access token save to token update event
    if (tokens.refresh_token) {
      fs.writeFile(path.join(__dirname, CREDENTIALS_FOLDER, 'token.txt'), tokens.refresh_token, (err) => {
        if (err) console.error(err);
      });
    }
  });

  return client;
}

exports.asyncCallback = async (callbackFunctions, authClient, final = null) => {
  if (typeof callbackFunctions == 'function') {
    await callbackFunctions(authClient) // Run single callback Function
  } else if (typeof callbackFunctions == 'object') {
    if (callbackFunctions.length > 0) {
      for (const callback of callbackFunctions) {
        if (typeof callback == 'function') {
          await callback(authClient); // Run callback function in Array
        } else throw TypeError('One or more callback functions is not a function');
      }
    } else throw TypeError("Callback is not a Function or Array of Functions");
  } else throw TypeError("Callback is not a Function or Array of Functions");

  if (final) { final(); }
}

exports.secrets = async () => {
  const readFile = promisify(fs.readFile);
  var secrets = await readFile(path.join(__dirname, CREDENTIALS_FOLDER, 'credentials.json'), {encoding: 'utf8'});
  return JSON.parse(secrets).installed;
}