const electron = require("electron");
const os       = require("os");

function getWindow(callback) {
  const browser = electron.BrowserWindow.getFocusedWindow() || electron.BrowserWindow.getAllWindows()[0];
  if (!browser)
    return;

  browser.restore();
    if (typeof callback === "function")
      callback(browser);
}

function sendAction(action) {
  getWindow(browser => {
    browser.webContents.send(action);
  });
}

module.exports = electron.Menu.buildFromTemplate([
  {
    label: process.platform === "darwin" ? electron.app.getName() : "File",
    submenu: [
      {
        role: "about"
      },
      {
        type: "separator"
      },
      {
        role: "services",
        submenu: []
      },
      {
        type: "separator"
      },
      {
        role: "hide"
      },
      {
        role: "hideothers"
      },
      {
        role: "unhide"
      },
      {
        type: "separator"
      },
      {
        role: "quit"
      }
    ]
  },
  {
    label: "Edit",
    submenu: [
      {
        role: "undo"
      },
      {
        role: "redo"
      },
      {
        type: "separator"
      },
      {
        role: "copy"
      },
      {
        role: "cut"
      },
      {
        role: "paste"
      },
      {
        role: "pasteandmatchstyle"
      },
      {
        role: "delete"
      },
      {
        role: "selectall"
      }
    ]
  },
  {
    role: "window",
    submenu: [
      {
        role: "minimize"
      },
      {
        role: "zoom"
      },
      {
        role: "togglefullscreen"
      },
      {
        role: "close"
      },
      {
        type: "separator"
      },
      {
        role: "front"
      },
      {
        role: "separator"
      }, 
      {
        label: "reload",
        click() {
          electron.getCurrentWindow().reload();
        }
      }
    ]
  },
  {
    role: "help",
    submenu: [
      {
        label: "Report an Issue...",
        click() {
          const body = `\n\n${electron.app.getName()} ${electron.app.getVersion()}\n${process.platform} ${process.arch} ${os.release()}`;
          electron.shell.openExternal(`https://github.com/theplasmaguy/${electron.app.getName()}/issues/new?body=${encodeURIComponent(body)}`);
        }
      }
    ]
  }
]);
