// ===== Véco Bingerville — réception des avis + design du Google Sheet =====
var SHEET_ID = "1QpERcsMb-VQ8LR9j7txNnmEHDJ5E5bCIt50LYwS_yUM";
var HEADERS = ["Date", "Prénom", "Type", "Commentaire", "Section", "Titre section", "Élément", "Sélecteur", "Page", "Écran", "Thème", "Appareil", "Capture"];

function doPost(e) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  var d = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(d.date), d.name, d.type, d.comment, d.section, d.sectionTitle, d.elementText, d.selector, d.page, d.viewport, d.theme, d.userAgent]);
  if (d.screenshot && d.screenshot.indexOf("base64,") > -1) {
    try {
      var b64 = d.screenshot.split("base64,")[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(b64), "image/jpeg", "avis-" + Date.now() + ".jpg");
      var folders = DriveApp.getFoldersByName("Véco - captures des avis");
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Véco - captures des avis");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var row = sheet.getLastRow();
      sheet.getRange(row, 13).setFormula('=IMAGE("https://drive.google.com/uc?export=view&id=' + file.getId() + '",4,150,280)');
      sheet.setRowHeight(row, 160);
    } catch (err) { sheet.getRange(sheet.getLastRow(), 13).setValue("capture échouée : " + err); }
  }
  return ContentService.createTextOutput("ok");
}

// À exécuter UNE FOIS à la main (▶️) pour appliquer le design.
function designerLeSheet() {
  var BLUE = "#0412F2", ORANGE = "#FF3D0A", INK = "#0B0E33", MIST = "#F3F4FF", LINE = "#DADDF5", MUTED = "#5A5E86";
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheets()[0];
  sh.setName("Avis");
  sh.setTabColor(ORANGE);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  var maxRows = Math.max(sh.getMaxRows(), 1000);
  if (sh.getMaxRows() < maxRows) sh.insertRowsAfter(sh.getMaxRows(), maxRows - sh.getMaxRows());
  var all = sh.getRange(1, 1, maxRows, HEADERS.length);

  // Base : police, couleurs, alignement
  all.setFontFamily("Poppins").setFontSize(10).setFontColor(INK).setVerticalAlignment("top").setBackground("#FFFFFF");
  sh.getRange(2, 4, maxRows - 1, 1).setWrap(true);   // Commentaire
  sh.getRange(2, 7, maxRows - 1, 1).setWrap(true);   // Élément
  sh.getRange(2, 1, maxRows - 1, 1).setNumberFormat("dd/MM/yyyy HH:mm");
  sh.getRange(2, 1, maxRows - 1, 1).setFontColor(MUTED);

  // En-tête
  sh.getRange(1, 1, 1, HEADERS.length)
    .setBackground(BLUE).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(11)
    .setVerticalAlignment("middle").setHorizontalAlignment("left");
  sh.setRowHeight(1, 42);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(0);

  // Lignes alternées (bandes)
  sh.getBandings().forEach(function (b) { b.remove(); });
  var band = all.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  band.setHeaderRowColor(BLUE).setFirstRowColor("#FFFFFF").setSecondRowColor(MIST);

  // Colonne Commentaire en gras léger pour la lisibilité
  sh.getRange(2, 4, maxRows - 1, 1).setFontWeight("bold");
  sh.getRange(2, 2, maxRows - 1, 1).setFontColor(BLUE).setFontWeight("bold"); // Prénom

  // Bordures fines
  sh.getRange(1, 1, maxRows, HEADERS.length).setBorder(null, null, true, null, null, true, LINE, SpreadsheetApp.BorderStyle.SOLID);

  // Largeurs
  var widths = [130, 100, 140, 420, 110, 170, 240, 200, 160, 90, 70, 200, 300];
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.hideColumns(8, 1);  // Sélecteur (technique)
  sh.hideColumns(12, 1); // Appareil (technique)

  // Couleurs selon le type d'avis
  var typeRange = sh.getRange(2, 3, maxRows - 1, 1);
  var rules = [
    ["Problème", "#FFE3DB", "#B42500"],
    ["J'aime",   "#DDF4EA", "#0A7A55"],
    ["Idée",     "#E3E6FF", "#020A9E"],
    ["Question", "#FFF3CD", "#8A6100"]
  ].map(function (r) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains(r[0]).setBackground(r[1]).setFontColor(r[2]).setBold(true)
      .setRanges([typeRange]).build();
  });
  sh.setConditionalFormatRules(rules);

  // Filtre
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, Math.max(sh.getLastRow(), 2), HEADERS.length).createFilter();

  // ----- Onglet Résumé -----
  var old = ss.getSheetByName("Résumé");
  if (old) ss.deleteSheet(old);
  var r = ss.insertSheet("Résumé", 1);
  r.setTabColor(BLUE);
  r.setHiddenGridlines(true);
  r.getRange("A1:F30").setFontFamily("Poppins").setFontColor(INK).setBackground("#FFFFFF");
  r.setColumnWidth(1, 40); r.setColumnWidth(2, 240); r.setColumnWidth(3, 110); r.setColumnWidth(4, 40); r.setColumnWidth(5, 280); r.setColumnWidth(6, 110);

  r.getRange("B1:F2").merge().setValue("Véco Bingerville — Retours des testeurs")
    .setBackground(BLUE).setFontColor("#FFFFFF").setFontSize(18).setFontWeight("bold").setVerticalAlignment("middle").setHorizontalAlignment("left");
  r.setRowHeight(1, 30); r.setRowHeight(2, 30);

  r.getRange("B4").setValue("Total des avis").setFontColor(MUTED).setFontWeight("bold");
  r.getRange("B5").setFormula("=COUNTA(Avis!D2:D)").setFontSize(36).setFontWeight("bold").setFontColor(ORANGE);
  r.setRowHeight(5, 56);

  r.getRange("B7:C7").setValues([["Par type", "Avis"]]).setBackground(MIST).setFontWeight("bold").setFontColor(BLUE);
  var types = [["💡 Idées", "Idée"], ["🐞 Problèmes", "Problème"], ["❤️ J'aime", "J'aime"], ["❓ Questions", "Question"]];
  types.forEach(function (t, i) {
    r.getRange(8 + i, 2).setValue(t[0]);
    r.getRange(8 + i, 3).setFormula('=COUNTIF(Avis!C2:C,"*' + t[1] + '*")').setFontWeight("bold").setHorizontalAlignment("right");
  });

  r.getRange("E7:F7").setValues([["Sections les plus commentées", "Avis"]]).setBackground(MIST).setFontWeight("bold").setFontColor(BLUE);
  r.getRange("E8").setFormula('=IFERROR(QUERY(Avis!F2:F,"select F, count(F) where F is not null group by F order by count(F) desc limit 10 label F \'\', count(F) \'\'",0),"—")');
  r.getRange("F8:F17").setHorizontalAlignment("right").setFontWeight("bold");

  r.getRange("B13").setValue("Astuce : filtre l'onglet « Avis » par Type ou par Section.").setFontColor(MUTED).setFontStyle("italic");

  ss.setActiveSheet(sh);
}
