// =======================================================================
// Global settings
// Comma-separated list of recipients. Comment out to not send any emails.
var RECIPIENT_EMAIL = ['Alma.velazquez0@walmart.com','Juan.Esparza@walmart.com','alma.velazquezg@gmail.com','josealbertohm@gmail.com','Monik.Flores@walmart.com'];
var URL_REF_EMAIL = 'www.walmart.com.mx';
var URL_NAME_EMAIL = 'Walmart México';

// 18 Cuentas
var CONFIG_SPREADSHEETS_URL = 'https://docs.google.com/spreadsheets/d/1uVvkfn0JbNJlk63W_--FU6gM-jUwKEHGXOI9l3dvANM/edit?usp=sharing';
// Cuentas Buen-Fin
// var CONFIG_SPREADSHEETS_URL = 'https://docs.google.com/spreadsheets/d/1DG-0BwGkUJYiwMqMkHsJ_jjocN8ooS50n3_aqF8YHFg/edit?usp=sharing';
var CONFIG_SPREADSHEET_NAME = 'Cuentas';

var TEXT_TO_SEARCH_LISTA = 'btnAgregaLista';
var TEXT_TO_SEARCH_CARRITO = 'btnAgregaCarrito';

var REPORT_PREFIX = 'Walmart AdWords reporte de URLs ';
var LOG_LEVEL = 'info'; 
var IS_TEST = 0;
var ONLY_PAUSSED = 1;
var gScript = null;
// =======================================================================

function main(){
  if (gScript==null){
    gScript = getRemoteScript();
  }

  var accounts = MccApp.accounts().withIds( gScript.createConfigReport().split(",") );
  gScript.info('Processing ' + accounts.get().totalNumEntities() + ' account(s)');
  accounts.executeInParallel("checkUrlsReport", "reportResults");
  gScript.info("Process completed");
}


/**
 * Function for read the Remote script with the URL
 * @param {none}
 * @return {object} Object reference for the script 
 */
function getRemoteScript(){
  var REMOTE_SCRIPT_URL = "https://goo.gl/cvYqX0";
  Logger.log("Reading remote script by URL " + REMOTE_SCRIPT_URL);
  var scriptFile = UrlFetchApp.fetch(REMOTE_SCRIPT_URL);
  var scriptText = scriptFile.getContentText();

  var className = "checkAdsUrlRemoteScript";
  Logger.log("Evaluating the adword script text");
  eval(scriptText);
  return eval('new ' + className + '()\;');
}


/**
 * Function for validate Adwords URL for each MCC account in parallel mode
 * @param {none}
 * @return {array} Array in JSON format with the data results for each MCC account
 */
function checkUrlsReport(){ 
  if (gScript==null){
    gScript = getRemoteScript();
  }
  
  return gScript.checkUrlsReport( AdWordsApp.currentAccount() );
}


/**
 * Send an email with the Spread Sheets URL details for the email(s) defined
 * @param {array} Array with the results in JSON format
 * @return {none}.
 */
function reportResults(results){
  if (gScript==null){
    gScript = getRemoteScript();
  }  
  gScript.reportResults(results);
}
