const electron                   = require('electron');
const {app, Menu, BrowserWindow} = require('electron');
const path                       = require('path');
const {google}                   = require('googleapis');
const MenuInfo                   = require('./modules/Menu');
const Storage                    = require('./modules/Storage');
const GoogleAuth                 = require('./modules/GoogleAuth');


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}


// Basic Process Variables
let mainWindow; // Prevent Main Window Garbage Collection
let isQuitting = false; // Quit Information Container


// Create Main Render Process
const createMainWindow = () => {
  const lastState = Storage.get("mainWindowState") || {width: 900, height: 675}; // Retrieve last state of Window for recreation

  mainWindow = new BrowserWindow({ // Create Render Process (Window)
    width: lastState.width,
    height: lastState.height,
    x: lastState.x,
    y: lastState.y,
    minWidth: 600,
    minHeight: 450,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true
  });

  // Load Window HTML file
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  mainWindow.webContents.openDevTools();

  // Handle Window Closing
  mainWindow.on('close', event => {
    if (isQuitting) return;

    event.preventDefault();

    if (process.platform === "darwin")
      app.hide();
    else
      app.quit();
  });
};


// Pull Missionary Data to global.data
function pullData(auth) {
  const missionaries = {}
  const sheets = google.sheets({version:'v4',auth:auth});
  sheets.spreadsheets.values.get({
      spreadsheetId: '1fDM_KEVDL-10EaAFwHdxFaRJ8a9dgjiWBlflLjZE7ek',
      range: 'IMOS!B3:U'
    },
    (err, res) => {
      if (err) {
        console.error('The API returned an error.');
        throw err;
      }
      const rows = res.data.values;
      if (rows.length === 0) {
        console.log('No data found.');
      } else {
        for (const row of rows) {
          // Print columns A and E, which correspond to indices 0 and 4.
          const missionary = {
            name: {
              first: row[1],
              last: row[0]
            },
            phone: row[11],
            email_personal: row[13],
            email_area: row[19]
          }
          missionaries[row[0] + row[1]] = missionary;
        }
      }
    }
  );
  global.missionaries = missionaries;
}


// Initialization Finished
app.on('ready', () => { 
  Menu.setApplicationMenu(MenuInfo);

  if (!mainWindow)
    createMainWindow();

  GoogleAuth.auth(pullData);

  // Set global variables to allow use of Google API by render process
  global.authorize = GoogleAuth.auth;
  global.google = google;

  mainWindow.show();
});


// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin')
    app.quit();
});


// Recreate window on Activate (macOS only)
app.on('activate', () => {
  if (mainWindow === null)
    createMainWindow();

  mainWindow.show();
});


// Store State Information Before App Quit
app.on("before-quit", () => {
  isQuitting = true;

  if (mainWindow && !mainWindow.isFullScreen())
    Storage.set("mainWindowState", mainWindow.getBounds());
});
