/* Menu Bar Operating Scripts for MissionMail Render Process*/

$("#menu-close").click(function() {
  current_window.close()
});

$("#menu-minimize").click(function() {
  current_window.minimize()
});

$("#menu-reload").click(function() {
  current_window.webContents.reload()
});

$("#menu-settings").click(function() {
  if (current_window.webContents.isDevToolsOpened()) {
    current_window.webContents.closeDevTools();
  } else {
    current_window.webContents.openDevTools();
  }
});
