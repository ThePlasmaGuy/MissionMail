// MissionMail Basic UI Scripts

/* Table of Contents:
 * Settings
 * Base State Variables
 * Basic Functions
 * Startup Scripts
 * Menu Bar (Window State) Buttons
 * Options Bar Buttons
 * GMail Setup Scripts
 * contentPane Scripts
 * Reusable Pane Scripts
 * startup Pane Scripts
 * mailAlerts Scripts
 * requestHelp Scripts
 */

// Settings
const technologySpecialist = 'HarrisEvin' // missionaries array index for current Mission Technology Specialist
const mailgunDomain = 'mm.slcw.pw'; // Domain registered with Mailgun for sending email
const credentialsFolder = 'auth'; // Path to Credentials (Ex: Google, Mailgun)
let phoneSMSGateway = '@tmomail.net'; // SMS Gateway to send text messages through for missionary phones

// Base State Variables
let mainWindow = remote.getCurrentWindow();
const {dialog} = remote;

  // Remote Variables
var google = remote.getGlobal('google'); // Google Library
let nodemailer = remote.getGlobal('nodemailer'); // Nodemailer Library
let auth = remote.getGlobal('auth'); // GoogleAPI Auth Function
let googleClient = remote.getGlobal('googleClient'); // Google oAuth2 Client
let missionaries = remote.getGlobal('missionaries'); // Missionary Data
let companionships = remote.getGlobal('companionships'); // Companionship Data
let zoneLeaders = remote.getGlobal('zoneLeaders'); // Zone Leader Data

let windowBusy = false; // If True, Block Exit

// Other Libraries
const path = nodeRequire('path');
const fs = nodeRequire('fs');
const mailgun = nodeRequire('mailgun-js');

// Basic Functions
function preventWindowExit() {
  windowBusy = true;
  $("#window-close").addClass('disabled').attr('aria-label', 'Unable to Close!');
}

function allowWindowExit() {
  windowBusy = false;
  $("#window-close").removeClass('disabled').attr('aria-label', 'Close Window');
}

function logErrors(err) {
  const sheets = google.sheets({version:'v4',auth:googleClient});
  sheets.spreadsheets.values.append({
    spreadsheetId: '1AHcZVYH5Bqdk3GctTOuc3HIc8oPl1Dv6KyILg1ErQ50',
    range: 'ERRORS!A2:B',
    insertDataOption: 'INSERT_ROWS',
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[new Date(Date.now()).toLocaleString(), JSON.stringify(err)]]
      }
  }, (err, res) => {
    if (err) return console.log('Error Logging Packages:' + err)
  });
}

// Startup Scripts
$('#requestHelp #info-subtitle').html(`Version ${remote.app.getVersion()}`);
$('#requestHelp #changelogs > div').children().first().html('Latest Version');

// Menu Bar (Window State Buttons)
$("#window-close").click(function() {
  if (windowBusy) return
  mainWindow.close();
});

$("#window-sizeState").click(function() {
  if (mainWindow.isMaximized()) mainWindow.restore();
  else mainWindow.maximize();
});

$("#window-minimize").click(function() {
  mainWindow.minimize();
});

// Options Bar Buttons

let keysPressed = {} // Track Keypresses
window.onkeyup = function(e) { keysPressed[e.keyCode] = false; }
window.onkeydown = function(e) { keysPressed[e.keyCode] = true; }

$("#help-reload").click(function() {
  if (!keysPressed[18]) {
    if (confirm('Clear current data and reload?')) mainWindow.reload();
  } else mainWindow.reload();
});
$("#help-reload").contextmenu(function(e) { mainWindow.reload(); e.preventDefault(); });

$("#help-dev").click(function() {
  if (mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.closeDevTools();
  } else {
    mainWindow.webContents.openDevTools({mode: 'detach'});
  }
});

// Mail Setup Scripts
  // HTTP Api (Mailgun) for Standard Emails
let mg = null;

fs.readFile(path.join(__dirname, credentialsFolder, 'mailgunToken.txt'), (err, content) => {
  if (err) return console.log('ERROR loading client secret file:', err);

  mg = mailgun({apiKey: content, domain: mailgunDomain});
});

  // SMTP (Gmail) for Area Phones
let secrets = undefined;
let smtpTransport = undefined;
let gmailTransport = undefined;
let testTransport = undefined;
let testServerEnabled = false;

const setupMail = async () => {
  secrets = await auth.secrets();
}
setupMail().then(() => {
  gmailTransport = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxMessages: 30,
    rateLimit: 2,
    auth: {
      type: 'OAuth2',
      user: remote.getGlobal('authEmail'),
      clientId: secrets.client_id,
      clientSecret: secrets.client_secret,
      refreshToken: googleClient.credentials.refresh_token,
      accessToken: googleClient.credentials.access_token,
      expires: googleClient.credentials.expiry_date
    }
  });

  testTransport = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'xkqkn4s2lzxj5opr@ethereal.email',
      pass: 'p9XEZtC1fumEZgcWBw'
    }
  });

  if (testServerEnabled) {
    smtpTransport = testTransport;
  } else {
    smtpTransport = gmailTransport;
  }
});

function swapSmtpTransport() { // Swap between the Test SMTP Server and the GMail SMTP Server
  if (testServerEnabled) {
    testServerEnabled = false;
    smtpTransport = gmailTransport;
  } else {
    testServerEnabled = true;
    smtpTransport = testTransport;
  }

  return testServerEnabled ? 'Test Server Enabled' : 'Production Server Enabled';
}

// contentPane Scripts
function switchPane(panelID, buttonID=0) {
  // If enabled, check if user really wants to leave.
  if ($('.contentPane.active.confirmDeletion.edited').length) {
    if (!confirm('Are you sure you want to clear the current data?')) return
  }

  // Handle Button 'Active' state
  $('.navigation-button').removeClass('active'); // Deactivate existing buttons
  if (!buttonID) {
    if ($('#' + panelID + 'Button').length) $('#' + panelID + 'Button').addClass('active'); // Activate correct button
  } else $('#' + buttonID).addClass('active');

  // Handle Reset Scripts
  if ($('#' + panelID).attr('resetScript')) {
    window[$('#' + panelID).attr('resetScript')]();
  }

  // Handle Panel 'Active' state
  $('.contentPane').removeClass('active'); // Hide all existing panels
  if ($('#' + panelID).length) $('#' + panelID).addClass('active'); // Show panel
  else $('#' + $('#content').attr('default')).addClass('active'); // Revert to default panel (startup)
}

$("#navigation > .navigation-button").click(function() {
  switchPane($(this).attr('id').slice(0,-6));
});

$('#help-request').click(function() {
  switchPane('requestHelp', 'help-request');
});

// Reusable Pane Scripts
$('.options-select-option').click(function() {
  if ($(this).attr('status') == '1') {
    $(this).attr('status', 0);
  } else {
    $(this).attr('status', 1);
  }
});

// startup Pane Scripts
$('.paneInfo').click(function() {
  switchPane($(this).attr('id').slice(0,-4));
})

// mailAlerts Scripts
// missionaryEntry-package default html
let sendingMail = false;
let emailsLeftToSend = 0;
let emailsSuccessfullySent = 0;

const packageTypeOptions = {
  'package': 'Package',
  'letter': 'Letter',
  'tag': 'Name Tag',
  'cert': 'Ministerial Certificate',
  'bom': 'Book of Mormon'
}

function generateOptions(optionObject) {
  var optionList = '';

  for (var key in optionObject) {
    var newOption =  '<option value=\'' + key + '\'>' + optionObject[key] + '</option>';
    optionList += newOption;
  }

  return optionList;
}

function getOptionText(optionID) {
  if (optionID in packageTypeOptions) {
    return packageTypeOptions[optionID];
  } else return optionID;
}

const packageDefaults = `
<div class='missionaryEntry-package'>
  <div class='missionaryEntry-package-remove'>
      <svg viewBox="0 0 25 25">
          <rect x='5' y='10' width='14px' height = '3px'/>
      </svg>
  </div>
  <select class='missionaryEntry-package-type-value'>
    <option value='null' selected='selected'>Select Type</option>
    ${generateOptions(packageTypeOptions)}
  </select>
  <input class='missionaryEntry-package-quantity' type='number' value='1'/>
  <div class='missionaryEntry-package-quantity-modifier'>
    <div class='increment'>
      <svg viewBox="0 0 25 25">
        <path d="M19.44,13.89h-5.56v5.56h-2.78v-5.56H5.56v-2.78h5.56V5.56h2.78v5.56h5.56V13.89z"/> 
      </svg>
    </div>
    <div class='decrement'>
      <svg viewBox="0 0 25 25">
        <rect x="5" y="10" width="14px" height="3px"></rect>
      </svg>
    </div>
  </div>
</div>
`;

const missionaryEntryDefaults = `
<div class='missionaryEntry'>
  <div class='missionaryEntry-remove'>
    <svg viewBox="-4 -4 32 32">
      <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M1,10V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z" />
    </svg>
  </div>
  <select class='missionaryEntry-name-value'>
    <option value='null' selected='selected'>Select a Missionary</option>
  </select>
  <div class='missionaryEntry-addPackage'>
    <svg viewBox="0 0 25 25">
      <path d="M19.44,13.89h-5.56v5.56h-2.78v-5.56H5.56v-2.78h5.56V5.56h2.78v5.56h5.56V13.89z"/> 
    </svg>
  </div>
  <div class='missionaryEntry-packages'>
    ${packageDefaults}
  </div>
</div>
`;

var packageTypeDefaults = {
  containerCssClass: 'missionaryEntry-package-type-selectBox new',
  dropdownCssClass: 'missionaryEntry-package-type-dropdown',
  tags: true
}

var missionaryNameDefaults = {
  data: remote.getGlobal('missionariesAutofill'),
  containerCssClass: 'missionaryEntry-name-selectBox new',
  dropdownCssClass: 'missionaryEntry-name-dropdown',
}

function resetMailAlerts() { // Reset Mail Alerts each Page Load
  allowWindowExit();
  sendingMail = false;
  $('#mailAlerts .loading.inprogress').removeClass('inprogress')
  $('#mailAlerts').removeClass('edited');
  var missionaryTable = $('#mailAlerts').find('#missionaryTable').first();
  missionaryTable.empty();
  var defaultEntry = $(missionaryEntryDefaults).appendTo(missionaryTable);
  var typeSelect = defaultEntry.find('.missionaryEntry-package-type-value')
  typeSelect.select2(packageTypeDefaults);
  typeSelect.on('select2:select', function (event) { $('#mailAlerts').addClass('edited'); });
  $('.missionaryEntry-package-type-selectBox.new').removeClass('new').parent().parent().addClass('missionaryEntry-package-type');
  var nameSelect = defaultEntry.find('.missionaryEntry-name-value')
  nameSelect.select2(missionaryNameDefaults);
  nameSelect.on('select2:select', function (event) { $('#mailAlerts').addClass('edited'); });
  $('.missionaryEntry-name-selectBox.new').removeClass('new').parent().parent().addClass('missionaryEntry-name');
  $('.options-select-option').each(function() { $(this).attr('status', '1')});
}

$('#missionaryTable').on('click', '.missionaryEntry-addPackage', function() {
  $(packageDefaults).appendTo($(this).siblings('.missionaryEntry-packages')).find('.missionaryEntry-package-type-value').select2(packageTypeDefaults);
  $('.missionaryEntry-package-type-selectBox.new').removeClass('new').parent().parent().addClass('missionaryEntry-package-type');
  $('#mailAlerts').addClass('edited');
});

$('#missionaryTable').on('click', '.missionaryEntry-package-remove', function() {
  if ($(this).parent().siblings().length > 0) $(this).parent().remove();
});

$('#missionaryTable').on('click', '.missionaryEntry-package-quantity-modifier .increment', function() {
  var valueBox = $(this).parent().parent().children('.missionaryEntry-package-quantity').first();
  valueBox.val(parseInt(valueBox.val()) + 1);
});

$('#missionaryTable').on('click', '.missionaryEntry-package-quantity-modifier .decrement', function() {
  var valueBox = $(this).parent().parent().children('.missionaryEntry-package-quantity').first();
  if (!(valueBox.val() <= 1)) valueBox.val(parseInt(valueBox.val()) - 1);
});

$('#mailAlerts .options-addMissionary').click(function() {
  var newEntry = $(missionaryEntryDefaults).appendTo('#missionaryTable');
  newEntry.find('.missionaryEntry-package-type-value').select2(packageTypeDefaults);
  $('.missionaryEntry-package-type-selectBox.new').removeClass('new').parent().parent().addClass('missionaryEntry-package-type');
  newEntry.find('.missionaryEntry-name-value').select2(missionaryNameDefaults);
  $('.missionaryEntry-name-selectBox.new').removeClass('new').parent().parent().addClass('missionaryEntry-name');
  $('#mailAlerts').addClass('edited');
})

$('#missionaryTable').on('click', '.missionaryEntry-remove', function() {
  if ($(this).parent().siblings().length > 0) $(this).parent().remove();
});

$('#mailAlerts .options-select-option').click(function() { $('#mailAlerts').addClass('edited'); });

$('#mailAlerts .options-send').click(function() { // Send Mail
  if (sendingMail) return; // Ignore if already sending mail

  // Gather Options Values
  const areaPhones = ($('#alerts-phones').attr('status') == '1');
  const personalEmails = ($('#alerts-personal').attr('status') == '1');
  const zoneLeaders = ($('#alerts-zoneLeaders').attr('status') == '1');

  // Gather Package Data
  const missionaryEntries = $('#missionaryTable').children();

  if (missionaryEntries.length == 1 && missionaryEntries.first().children('.missionaryEntry-name-value').val() == 'null') {
    alert('No Data Entered - Please Enter Data and Try Again!');
    return;
  }

  var missingNames = false;
  var haveNames = 0;
  var exit = false;
  var zonePackages = {};

  missionaryEntries.each(function () { // Check Data Validity and Compile
    preventWindowExit();
    $('#mailAlerts .loading').addClass('inprogress'); // Startup Loading Screen

    var missionaryKey = $(this).children('.missionaryEntry-name-value').val();

    var currentMissionary = { // Assemble Missionary Entry from DOM Data
      'data': missionaries[missionaryKey]
    }
    
    if (missionaryKey == 'null') {
      missingNames = true;
    } else {
      haveNames += 1;
      var packages = {}

      $(this).children('.missionaryEntry-packages').children().each(function () {
        if ($(this).children('.missionaryEntry-package-type-value').val() == 'null') {
          alert(`Missing Package Type Data for ${currentMissionary.data.type + ' ' + currentMissionary.data.name.last} - Please fill in package data and try again`);
          exit = true;
          return;
        } else if ($(this).children('.missionaryEntry-package-quantity').val() == '0') {
          alert(`Missing Package Quantity for ${currentMissionary.data.type + ' ' + currentMissionary.data.name.last} - Please select number of ${getOptionText($(this).children('.missionaryEntry-package-type-value').val()).toLowerCase()}s and try again`);
          exit = true;
          return;
        } else {
          var type = $(this).children('.missionaryEntry-package-type-value').val();
          var quantity = $(this).children('.missionaryEntry-package-quantity').val();

          if (type in packages) { // Assemble package information
            packages[type] += quantity; // Combine Duplicates to account for ID10T Errors
          } else {
            packages[type] = quantity;
          }
        }
      });

      currentMissionary['packages'] = packages; // Add assembled package data to Missionary Entry

      // Store Missionary Entries by Zone for ZL Notification
      if (!(currentMissionary.data.zone in zonePackages)) { // Create Zone Entry if DNE
        zonePackages[currentMissionary.data.zone] = [];
      }

      if (missionaryKey in zonePackages[currentMissionary.data.zone]) { // Easy Duplicate Checking *Maybe Add to pre-checks in the future?*
        alert(`Duplicate Missionaries Listed (${currentMissionary.data.type + ' ' + currentMissionary.data.name.last}) - Please Remove the Duplicate and Try Again`)
        exit = true;
        return;
      }

      zonePackages[currentMissionary.data.zone][missionaryKey] = currentMissionary; // Assign Entry to Zone
    }
  });

  if (exit) { // Return & kill loading screen if neccesary at this point
    allowWindowExit();
    $('#mailAlerts .loading').removeClass('inprogress');
    return;
  }

  if (!haveNames) { // If no actual data, return and kill loading screen
    alert('No missionary entries are assigned to actual missionaries.  Please fill out the form and try again.');
    allowWindowExit();
    $('#mailAlerts .loading').removeClass('inprogress');
    return;
  } else if (missingNames) { // Some are missing, prompt to continue or not
    if (!confirm('Some entries are not assigned to a missionary.  Ignore those and send alerts anyways?')) {
      allowWindowExit();
      $('#mailAlerts .loading').removeClass('inprogress');
      return
    }
  }

  emailsSuccessfullySent = 0; // Reset Email Counter to 0 (Loading screen checks)

  if (zoneLeaders) alertZoneLeaders(zonePackages, personalEmails, areaPhones); // Alert Zone Leaders (if enabled)
  alertMissionaries(zonePackages, personalEmails, areaPhones); // Alert Missionaries
  addPackagesToLog(zonePackages); // Log Stuff
});

function alertZoneLeaders(zonePackages, personalEmails, areaPhones) {
  for (var zone in zonePackages) {
    var missionaryList = '';

    for (var missionary in zonePackages[zone]) {
      var packageList = '';

      for (var mPackage in zonePackages[zone][missionary].packages) {
        packageList += `<div class=\'package\'>${getOptionText(mPackage)} - ${zonePackages[zone][missionary].packages[mPackage]}</div>`;
      }

      missionaryList += `<div class='missionary'><div class='title'>${zonePackages[zone][missionary].data.type} ${zonePackages[zone][missionary].data.name.first} ${zonePackages[zone][missionary].data.name.last}</div>${packageList}</div>`;
    }

    var emailContent = mailAlertsTemplate.replace('<<<MAIL_INFO>>>', missionaryList);
    var emailsToSend = zoneLeaders[zone].email;
    
    let companionship = Object.values(missionaries).filter((obj) => {
      return Object.values(obj).includes(zoneLeaders[zone].area);
    })

    if (personalEmails) {      
      for (missionary in companionship) {
        emailsToSend += ', ' + companionship[missionary].email_personal;
      }
    }

    incrementEmailsToSend();


    var email = {
      from: `MissionMail <missionmail@${mailgunDomain}>`,
      to: emailsToSend,
      subject: `Mail in Mission Office for ${zone.substring(0, zone.length - 4).replace(/([A-Z])/g, ' $1').trim()} Zone`,
      html: emailContent,
      attachments: [{
          filename: 'header.png',
          path: __dirname + '/assets/img/header.png',
          cid: 'header-logo'
      }]
    };
    
    var messageData = {
      to: emailsToSend,
      companionship: companionship,
      content: emailContent,
      type: 'Email',
      targetString: `the Zone Leaders of ${zone.substring(0, zone.length - 4).replace(/([A-Z])/g, ' $1').trim()}`
    }

    mg.messages().send(email, (err, res) => {
      emailSendCallback(err, res, messageData)
    });

    if (areaPhones) {
      var textContent = `Mail in Office:\n${missionaryList.replace('<div class=\'title\'>', '\n').replace(/<div.+?>/g, '').replace(/<\/div>/g, '\n')}`;
      var phonesToSend = [];

      for (var index in zoneLeaders[zone].phone) {
        phonesToSend.push(`${zoneLeaders[zone].phone[index].replace(/-/g, '').replace('+1 ', '')}${phoneSMSGateway}`)
      }

      incrementEmailsToSend();

      var textData = {
        to: phonesToSend,
        companionship: companionship,
        content: textContent,
        type: 'Text',
        targetString: `the Zone Leaders of ${zone.substring(0, zone.length - 4).replace(/([A-Z])/g, ' $1').trim()}`
      }

      smtpTransport.sendMail({
        from: 'Mission Mail <' + remote.getGlobal('authEmail') + '>',
        to: phonesToSend,
        subject: `Mail in Mission Office for ${zone.substring(0, zone.length - 4).replace(/([A-Z])/g, ' $1').trim()} Zone`,
        text: textContent,
        inline: path.join(__dirname, '/assets/img/header.png')
      }, function(err, res) {
        emailSendCallback(err, res, textData);
      });
    }
  }
}

function alertMissionaries(zonePackages, personalEmails, areaPhones) {
  var packageCompanionships = {};
  for (var zone in zonePackages) {
    for (var missionary in zonePackages[zone]) {
      var missionaryArea = zonePackages[zone][missionary].data.area.replace(/\s+/g, '');
      var companionshipPosition = companionships[missionaryArea].leadership;
      if (['ZL', 'ZT'].indexOf(companionshipPosition) < 0) {
        if (!(missionaryArea in packageCompanionships)) packageCompanionships[missionaryArea] = [];

        packageCompanionships[missionaryArea].push(zonePackages[zone][missionary]);
      }
    }
  }

  for (var area in packageCompanionships) {
    var missionaryList = '';
    var emailsToSend = packageCompanionships[area][0].data.email_area;
  
    for (var comp in packageCompanionships[area]) {
      var companion = packageCompanionships[area][comp];
      var packageList = '';
  
      for (var mPackage in companion.packages) {
        packageList += `<div class='package'>${getOptionText(mPackage)} - ${companion.packages[mPackage]}</div>`;
      }
  
      missionaryList += `<div class='missionary'><div class='title'>${companion.data.type} ${companion.data.name.first} ${companion.data.name.last}</div>${packageList}</div>`;
    }

    let companionship = Object.values(missionaries).filter((obj) => {
      return Object.values(obj).includes(packageCompanionships[area][0].data.area);
    });

    if (personalEmails) {
      for (missionary in companionship) {
        emailsToSend += ', ' + companionship[missionary].email_personal;
      }
    }

    var emailContent =  mailAlertsTemplate.replace('<<<MAIL_INFO>>>', missionaryList);

    var compList = companionship[0].name.last;

    for (var i=1; i<companionship.length; i++) {
      compList += ' & ' + companionship[i].name.last;
    }

    incrementEmailsToSend();

    var email = {
      from: `MissionMail <missionmail@${mailgunDomain}>`,
      to: emailsToSend,
      subject: `Mail in Mission Office`,
      html: emailContent,
      inline: path.join(__dirname, '/assets/img/header.png')
    };
    
    var messageData = {
      to: emailsToSend,
      companionship: companionship,
      content: emailContent,
      type: 'Email',
      targetString: compList
    }

    mg.messages().send(email, (err, res) => {
      emailSendCallback(err, res, messageData)
    });

    if (areaPhones) {
      var textContent = `Mail in Office:\n${missionaryList.replace('<div class=\'title\'>', '\n').replace(/<div.+?>/g, '').replace(/<\/div>/g, '\n')}`;
      var phonesToSend = [];

      for (var index in packageCompanionships[area][0].data.phone) {
        phonesToSend.push(`${packageCompanionships[area][0].data.phone[index].replace(/-/g, '').replace('+1 ', '')}${phoneSMSGateway}`)
      }

      incrementEmailsToSend();

      var textData = {
        to: phonesToSend,
        companionship: companionship,
        content: textContent,
        type: 'Text',
        targetString: compList
      }

      smtpTransport.sendMail({
        from: 'Mission Mail <' + remote.getGlobal('authEmail') + '>',
        to: phonesToSend,
        subject: 'Mail in Mission Office',
        text: textContent,
        attachments: [{
            filename: 'MissionMail.png',
            path: __dirname + '/assets/img/textLogo.png'
        }]
      }, function(err, res) {
        emailSendCallback(err, res, textData);
      });
    }
  }
}

function addPackagesToLog(zonePackages) {
  let logValues = []

  for (var zone in zonePackages) {
    for (var missionary in zonePackages[zone]) {
      for (var mPackage in zonePackages[zone][missionary].packages) {
        if (zonePackages[zone][missionary].packages[mPackage] != '1') {
          logValues.push([new Date(Date.now()).toLocaleString(), `${zonePackages[zone][missionary].data.type} ${zonePackages[zone][missionary].data.name.first} ${zonePackages[zone][missionary].data.name.last}`, `${getOptionText(mPackage)} (${zonePackages[zone][missionary].packages[mPackage]})`]);
        } else {
          logValues.push([new Date(Date.now()).toLocaleString(), `${zonePackages[zone][missionary].data.type} ${zonePackages[zone][missionary].data.name.first} ${zonePackages[zone][missionary].data.name.last}`, getOptionText(mPackage)]);
        }
      }
    }
  }

  const sheets = google.sheets({version:'v4',auth:googleClient});
  sheets.spreadsheets.values.append({
    spreadsheetId: '1AHcZVYH5Bqdk3GctTOuc3HIc8oPl1Dv6KyILg1ErQ50',
    range: 'PACKAGES!A2:C',
    insertDataOption: 'INSERT_ROWS',
    valueInputOption: "USER_ENTERED",
    resource: {
      values: logValues
      }
  }, (err, res) => {
    if (err) {
      logErrors(err);
      return console.log('Error Logging Help Messages:' + err)
    }
  });
}

let mailAlertsTemplate = undefined;
async function getMailAlertsTemplate() {
  const fs = nodeRequire('fs');
  const path = nodeRequire('path');
  const {promisify} = nodeRequire('util');

  const readFile = promisify(fs.readFile);
  mailAlertsTemplate = await readFile(path.join(__dirname, 'alertTemplate.html'), {encoding: 'utf8'});
}
getMailAlertsTemplate();

function incrementEmailsToSend() {
  emailsLeftToSend += 1;
}

function emailSendCallback(err, res, messageData) {
  if (err) {
    console.log(`Error Sending ${messageData.type} to ${messageData.targetString}\nPlease Try Again or Request Help`);
    console.log(err);
    logErrors([err, messageData]);
    alert(`Unable to Send ${messageData.type} to ${messageData.targetString}\nThe ${messageData.type} sent to the ${messageData.targetString} failed to send`)

    emailsLeftToSend -= 1;
    if (emailsLeftToSend == 0) {
      allowWindowExit();
      $('#mailAlerts .loading').removeClass('inprogress');
    }
  } else {
    console.log(`${messageData.type} Successfully Sent to ${messageData.targetString}!${(testServerEnabled) ? ' (TEST)' : ''}`);
    console.log(res);

    emailsSuccessfullySent += 1;
    emailsLeftToSend -= 1;
    if (emailsLeftToSend == 0) resetMailAlerts();
  }
}


// requestHelp Scripts
$('#requestHelp .options-send').click(function() {
  var helpMessage = $('#requestHelp .options textarea').val();
  $('#requestHelp .loading').addClass('inprogress');
  preventWindowExit();

  var email = {
    from: `UT SLC West Mission Office <office@${mailgunDomain}>`,
    to: `evin.harris.personal@gmail.com, theplasmaguy2403@gmail.com, ${missionaries[technologySpecialist].email_personal}, ${missionaries[technologySpecialist].email_area}`,
    subject: `Technology Help Request`,
    text: helpMessage
  };
  

  mg.messages().send(email, (err, res) => {
    if (err) {
      console.log('Error sending technology help request!');
      console.log(err);
      logErrors(err);
      allowWindowExit();
    } else {
      console.log('Help Request Successfully Sent!');
      console.log(res);
      $('#requestHelp .loading').removeClass('inprogress');
      allowWindowExit();
    }
  });

  const sheets = google.sheets({version:'v4',auth:googleClient});
  sheets.spreadsheets.values.append({
    spreadsheetId: '1AHcZVYH5Bqdk3GctTOuc3HIc8oPl1Dv6KyILg1ErQ50',
    range: 'HELP!A2:A',
    insertDataOption: 'INSERT_ROWS',
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[helpMessage]]
      }
  }, (err, res) => {
    if (err) {
      logErrors(err);
      return console.log('Error Logging Help Messages:' + err)
    }
  });

  $('#requestHelp .options textarea').val(''); // Clear Message Box
});

$('#info-completeHistory').click(function() {
  $('#requestHelp').toggleClass('showHistory')
})