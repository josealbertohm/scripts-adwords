/**
 * Function ToolScript for remote invocation
 * @param {none}
 * @return {none}
 */
function ToolScript(){

/**
 * Enables or Disables the Ad Status
 * @param {object} Ad entity object
 * @return {none}
 */
this.changeAdStatus = function(adEntity){
  if (adEntity.isEnabled()) {
    this.info('  Ad with id ' + adEntity.getId() + ' will be paused');
    adEntity.pause();
  } else if (adEntity.isPaused()) {
    this.info('  Ad with id ' + adEntity.getId() + ' will be enabled');
    adEntity.enable();
  }
}


/**
 * Validates the status (HTML response code) and HTML data with the Adword's URL.
 * @param {string} adsUrl The Adword's URL.
 * @return {array} The responseCode and content (0,1,2) in JSON format.
 */
this.fetchURL = function(adsUrl){
  var result = {};
  var now = new Date().getTime();
  var responseCode = 500;
  var response;
  try {
    response = UrlFetchApp.fetch(adsUrl, {muteHttpExceptions: true});
    responseCode = response.getResponseCode();
  } catch (e) {
    // Something went wrong. Since this a script error, let's mark it as 500
    this.warn(e.message);
  }
  
  var then = new Date().getTime();
  Utilities.sleep(then - now);
  result = {response:responseCode, content:0};
  
  // Response Code 200 [OK]
  if (responseCode==200){
    // Case 1 Agregar a Lista
    var indexOfSearch = response.getContentText().indexOf(TEXT_TO_SEARCH_LISTA);
    if ((indexOfSearch > 0)) {
      result = {response:responseCode, content:1};
  }  // End If Case 1 Agregar a Lista  
  else {
    // Case 2 Agregar a Carrito
      indexOfSearch = response.getContentText().indexOf(TEXT_TO_SEARCH_CARRITO);
    if ((indexOfSearch > 0)) {
         result = {response:responseCode, content:2};  
      }  // End If Case 2 Agregar a Carrito
    }
  }
  return result;
}


/**
 * Retrieves the spreadsheets copied identified by the URL.
 * @param {string} spreadsheetsUrl The URL of the spreadsheet.
 * @return {SpreadSheet} The spreadsheet.
 */
this.copySpreadsheets = function(spreadsheetsUrl, newSpreadSheetsName) {
  this.info('Copying spreadsheets document from ' + spreadsheetsUrl);
  return SpreadsheetApp.openByUrl(spreadsheetsUrl).copy(newSpreadSheetsName);
}

/**
 * Retrieves the spreadsheets identified by the URL.
 * @param {string} spreadsheetsUrl The URL of the spreadsheet.
 * @return {SpreadSheet} The spreadsheet.
 */
this.openSpreadsheets = function(spreadsheetsUrl) {
  this.info('Reading spreadsheets document from ' + spreadsheetsUrl);
  return SpreadsheetApp.openByUrl(spreadsheetsUrl);
}


/**
 * Retrieves the current date and time in the format requested
 * @param {string} format, date and time format requested
 * @return {string} The current date and time formatted
 */
this.getCurrentDate = function(format) { return Utilities.formatDate(new Date(), AdWordsApp.currentAccount().getTimeZone(), format); }

this.formatStringToNumber = function(numValue,isCurrency){
  if (numValue<1000){
    if (isCurrency){
      return '$ ' + numValue;
    } else {
      return numValue;
    }
  }
  if (isCurrency){
    return Utilities.formatString("$ %d,%02d%1f", numValue/1000, numValue%1000/10,numValue%10);
  } else {
    return Utilities.formatString("%d,%02d%1f", numValue/1000, numValue%1000/10,numValue%10);
  }
}

/**
 * Some functions to help with logging
 */
var LOG_LEVELS = { 'error':1, 'warn':2, 'info':3, 'debug':4 };
this.error = function(msg) { if(LOG_LEVELS['error'] <= LOG_LEVELS[LOG_LEVEL]) { this.log('ERROR',msg); } }
this.warn = function(msg)  { if(LOG_LEVELS['warn']  <= LOG_LEVELS[LOG_LEVEL]) { this.log('WARN' ,msg); } }
this.info = function(msg)  { if(LOG_LEVELS['info']  <= LOG_LEVELS[LOG_LEVEL]) { this.log('INFO' ,msg); } }
this.debug = function(msg) { if(LOG_LEVELS['debug'] <= LOG_LEVELS[LOG_LEVEL]) { this.log('DEBUG',msg); } }
this.log = function(type,msg) { Logger.log(type + ' - ' + msg); }

}