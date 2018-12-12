const electron                           = require('electron');
const {app, Menu, BrowserWindow, dialog} = require('electron');
const path                               = require('path');
const {google}                           = require('googleapis');
global.nodemailer                        = require('nodemailer');
const MenuInfo                           = require('./modules/Menu');
const Storage                            = require('./modules/Storage');
const GoogleAuth                         = require('./modules/GoogleAuth');


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}


// Basic Process Variables
let mainWindow; // Prevent Main Window Garbage Collection
let isQuitting = false; // Quit Information Container


// Create Main Render Process
const createMainWindow = () => {
  const lastState = Storage.get("mainWindowState") || {width: 600, height: 450}; // Retrieve last state of Window for recreation

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
    transparent: true,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'assets/icons/png/512x512.png')
  });

  // Load Window HTML file
  mainWindow.loadURL(`file://${__dirname}/index.html`);

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


// Pull Missionary Data to global.missionaries
function pullMissionaries(auth) {
  return new Promise((resolve, reject) => {
    global.missionaries = {} // Individual Missionary Data
    global.missionariesAutofill = [] // Missionary Autofill Data

    const sheets = google.sheets({version:'v4',auth:auth});
    sheets.spreadsheets.values.get({
        spreadsheetId: '1NkbA7dDG438urIS5ve9k3jmRgbBpou2YYHYp8RX5om0',
        range: 'DATA!A2:AA'
      },
      (err, res) => {
        if (err) {
          dialog.showErrorBox('MissionMail is Unable to Request Missionary Data', 'Please send your Mission Technology Specialist a Picture of this Error:\n\nIssue: Unable to Connect\nError:' + JSON.stringify(err));
          app.exit(0);
        }
        const rows = res.data.values;
        if (rows.length === 0) {
          dialog.showErrorBox('MissionMail is Unable to Request Missionary Data', 'Please send your Mission Technology Specialist a Picture of this Error:\n\nIssue: No Missionary Data Available');
          app.exit(0);
        } else {
          try {
            for (const row of rows) {
              // Each Missionary in IMOS

              var missionary = { // Missionary Data
                name: {
                  first: row[2],
                  last: row[1]
                },
                type: row[4],
                phone: [row[8]],
                email_personal: row[14],
                email_area: row[24],
                zone: row[21].replace(/\s+/g, '') + 'Zone',
                area: row[23]
              }
              for (var i=9; i<14; i++) {
                if (row[i] != '') {
                  missionary.phone.push(row[i]);
                }
              }
              const nameKey = row[1] + row[2] // LastFirst
              global.missionaries[nameKey] = missionary;

              global.missionariesAutofill.push({
                "id": nameKey, // LastFirst
                "text": row[4] + ' ' + row[2] + ' ' + row[1] // Elder/Sister First Last
              });
            }

            resolve();
          } catch(err) {
            dialog.showErrorBox('MissionMail is Unable to Compile Missionary Data', 'Please send your Mission Technology Specialist a Picture of this Error:\n\nIssue: Unable to Compile Data\nError:' + JSON.stringify(err));
            app.exit(0);
          }
        }
      }
    );
  });
}

// Pull Companionship Data to global.companionships
function pullCompanionships(auth) {
  return new Promise((resolve, reject) => {
    global.companionships = {}
    global.zoneLeaders = {}
    const sheets = google.sheets({version:'v4',auth:auth});
    sheets.spreadsheets.values.get({
        spreadsheetId: '1NkbA7dDG438urIS5ve9k3jmRgbBpou2YYHYp8RX5om0',
        range: 'CONTACTS!A1:AA'
      },
      (err, res) => {
          try {
          if (err) {
            dialog.showErrorBox('MissionMail is Unable to Request Companionship Data', 'Please send your Mission Technology Specialist a Picture of this Error:\n\nIssue: Unable to Connect\nError:' + JSON.stringify(err));
            app.exit(0);
          }
          const rows = res.data.values;
          if (rows.length === 0) {
            dialog.showErrorBox('MissionMail is Unable to Request Companionship Data', 'Please send your Mission Technology Specialist a Picture of this Error:\n\nIssue: No Companionship Data Available');
            app.exit(0);
          } else {
            for (const row of rows) {
              var companionship = {
                area: row[15],
                senior: row[0],
                junior: [row[9]],
                companions: [row[0], row[9]],
                leadership: (row[2] == '') ? 'SC' : row[2],
                zone: row[14],
                phone: [row[3]],
                email: row[16],
                address: row[17] + ' - ' + row[18]
              }
              for (var i=4; i<9; i++) {
                if (row[i] != '') {
                  companionship.phone.push(row[i]);
                }
              }
              for (var i=10; i<14; i++) {
                if (row[i] != '') {
                  companionship.junior.push(row[i]);
                  companionship.companions.push(row[i]);
                }
              }
    
              // Object Keys
              const areaKey = row[15].replace(/\s+/g, '');
              const zoneKey = row[14].replace(/\s+/g, ''); 

              global.companionships[areaKey] = companionship; // Key = Area Name w/o spaces
              if (row[2] == 'ZL' || row[2] == 'ZT') {
                global.zoneLeaders[zoneKey] = companionship; // Key = Zone Name w/o spaces
              }
            }
            resolve();
          }
        } catch(err) {
          dialog.showErrorBox('MissionMail is Unable to Compile Companionship Data', 'Please send your Mission Technology Specialist a Picture of this Error:\n\nIssue: Unable to Compile Data\nError:' + JSON.stringify(err));
          app.exit(0);
        }
      }
    );
  });
}

function getAuthEmail(auth) {
  global.authEmail = undefined;
  google.people('v1').people.get({
    resourceName: 'people/me',
    personFields: 'emailAddresses',
    auth: auth
  }, (err, res) => {
    if (err) {
      dialog.showErrorBox('MissionMail is Unable to fetch Authorized Email Address', 'Please send your Mission Technology Specialist a Picture of this Error:\n\nIssue: Unable to fetch Email Address\nError:' + JSON.stringify(err));
      app.exit(0);
    }

    global.authEmail = res.data.emailAddresses[0].value;
  });
}

// Initialization Finished
app.on('ready', () => { 
  Menu.setApplicationMenu(MenuInfo);

  // Authorize oAuth Client
  GoogleAuth.auth((client) => {
    global.googleClient = client;
    app.emit('authorized');
  });

  // Set global variables to allow use of Google API by render process
  global.auth = GoogleAuth;
  global.google = google;
});

// Google oAuth Client authorized
app.on('authorized', async () => {
  GoogleAuth.asyncCallback([
    pullMissionaries, 
    pullCompanionships,
    getAuthEmail
  ], global.googleClient, () => {
    app.emit('data-gathered')
  });
});

// Data Collection Complete
app.on('data-gathered', () => {
  if (!mainWindow)
    createMainWindow();
  
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
    Storage.set("mainWindowState", mainWindow.getBounds()); // ***TODO NOW*** Not autosaving?  Check this
});
