
/**
 * Function checkAdsUrlRemoteScript for remote invocation
 * @param {none}
 * @return {none}
 */
function checkAdsUrlRemoteScript(){
  this.main = function(){
    var accountList = createConfigReport();
    processAdsURL(accountList);
  }

/**
 * Function for generate the config spreadSheet report
 * @param {none}
 * @return {string} account list with the accounts to be processed
 */
function createConfigReport(){
  var accounts = MccApp.accounts().orderBy("ManagerCustomerId").get();
  info('Generating config report for the ' + accounts.totalNumEntities() + ' accounts.');
  var spreadSheets = openSpreadsheets(CONFIG_SPREADSHEETS_URL);
  var spreadSheet = spreadSheets.getSheetByName(CONFIG_SPREADSHEET_NAME);

  var row = 2;
  spreadSheet.getRange('A2:C50').setValue(""); // Clear all previous data
  spreadSheet.getRange('H10:H11').setValue(""); // Clear all previous data

  spreadSheet.getRange('H10').setValue( getCurrentDate('dd/MM/yyyy HH:mm:ss') );
  spreadSheet.getRange('H11').setValue( "procesando..." );
  
  while (accounts.hasNext()) {
    var account = accounts.next();
    MccApp.select(account);
    var numAds = AdWordsApp.ads().withCondition('Status IN [ENABLED,PAUSED]').get().totalNumEntities();
    debug('Account: ' + account.getName() + ' ' + account.getCustomerId() + ' with Ads: ' + numAds); 

    // Write account data details    
    spreadSheet.getRange('A' + row).setValue(account.getName());
    spreadSheet.getRange('B' + row).setValue(account.getCustomerId());
    spreadSheet.getRange('C' + row).setValue(numAds);
    row++;
  }
  info('Config report generated for the ' + accounts.totalNumEntities() + ' accounts.');
  info('Total accounts to be processed: ' + spreadSheet.getRange('H3').getValue());
  var accountList = spreadSheet.getRange('H1').getValue();
  accountList = accountList.replace(/,$/, "");
  info('Account list to be processed: ' + accountList);
  return accountList;
}


/**
 * Function for launching the Ads process in parallel
 * @param {string} account list with the accounts to be processed
 * @return {void}
 */
function processAdsURL(accountList){
  var accounts = MccApp.accounts()  
   .withIds(accountList.split(","));
  info('Processing ' + accounts.get().totalNumEntities() + ' accounts.');
  
  accounts.executeInParallel("checkUrlsReport", "reportResults");
}


/**
 * Function for validate Adwords URL for each MCC account in parallel mode
 * @param {none}
 * @return {array} Array in JSON format with the data results for each MCC account
 */
function checkUrlsReport() {
  var account = AdWordsApp.currentAccount();
  var accountName = account.getName();
  
  var processStartTime = getCurrentDate('dd/MM/yyyy HH:mm:ss');
  info('Processing account ' + account.getName() + ' - ' + account.getCustomerId());
  
  var iterator = AdWordsApp.ads()
    .withCondition('Status IN [ENABLED,PAUSED]')
    .orderBy('Id')
    .get();
  
  var resultsUrls = [];
  var accountProcessed = 0;
  var totalNumEntities = iterator.totalNumEntities();
  if (totalNumEntities>0){
    resultsUrls = checkUrls(iterator, account.getName());
    info('Account ' + account.getName() + ' - ' + account.getCustomerId() + ' processed ' + resultsUrls.length);
    accountProcessed = 1;
  } else {
    warn("The account " + account.getName() + " has not Ads enabled or paused");
  }
  var processEndTime = getCurrentDate('dd/MM/yyyy HH:mm:ss');
  
  return JSON.stringify({
    accountId : account.getCustomerId(),
    accountName : account.getName(),
  accountProcessed : accountProcessed,
  processStartTime : processStartTime,
  processEndTime : processEndTime,
  adsProcessed : resultsUrls.length,
    adsCount : totalNumEntities,
    adsResults : resultsUrls
  });  
}

/**
 * Function for validate each URL in the Ads listed the Ad Iterator
 * @param {iterator,string} Ads Iterator, Account Name
 * @return {array} Array in JSON format with the results
 */
function checkUrls(iterator, accountName) {
  if (!iterator.hasNext()) {
    return false;
  }

  var currentEntity = 0;
  var totalNumEntities = iterator.totalNumEntities();
  info('Validating ' + totalNumEntities + ' elements for account ' + accountName); 
  
  var urlMap = {};
  var results = [];
  while (iterator.hasNext()) {
    var ad = iterator.next();
      
    var campaign = ad.getCampaign();
      
    if ((currentEntity++ % 1000)==0){
      debug('Current entity ' + currentEntity + ' of ' + totalNumEntities + ' for account ' + accountName);
    }
        
    // Validate Campaign state (Enabled/Paused)
    var campaignState = ENABLED_STATE;
    if (campaign.isPaused()) {
      campaignState = PAUSSED_STATE;
    }
                
    // Validate Ad state (Enabled/Paused)
    var adState = ENABLED_STATE;
    if (ad.isPaused()) {
      adState = PAUSSED_STATE;
    }
        
    // var urls = [ad.urls().getFinalUrl(), ad.urls().getMobileFinalUrl()];
    var urls = [ad.urls().getFinalUrl()];
    var urlsList = "";
    for (var i = 0; i < urls.length; i++) {
      if (urls[i] == null) {
        results.push({ 
          campname:campaign.getName(),
          campiden:campaign.getId(),
          adgrpiden:ad.getAdGroup().getId(),
          adiden:ad.getId(),
          addesc:ad.getDescription1(),
          adsta1:'n/a',
          adsta2:'n/a',
          adchanged:adChanged,
          adhttp:'none',
          adresponse:0
        });
        
        continue;
      }
      
      // Avoid URL duplicated
      var lastUrl = encodeURI(urls[i]);
      if (!(lastUrl in urlMap)) {
        urlMap[lastUrl] = fetchURL(lastUrl);
      }
      
      var adNewState = adState;
      var adChanged = 0;
      // Case Añadir Lista
      if (urlMap[lastUrl].content==1) {
        if (adState==ENABLED_STATE){
          adNewState = PAUSSED_STATE;
          adChanged = 1;
        }
      }
      // Case Añadir A Carrito
      if (urlMap[lastUrl].content==2) {
        if (adState==PAUSSED_STATE){
          adNewState = ENABLED_STATE;
          adChanged = 1;
        }
      }
      
      if (adChanged==1){
        info("Changing the status to the Ad " + ad.getId() + ' in the account ' + accountName);
	if (IS_TEST==0){
          changeAdStatus(ad);
        }
      }
      
      results.push({ 
        campname:campaign.getName(),
        campiden:campaign.getId(),
        adgrpiden:ad.getAdGroup().getId(),
        adiden:ad.getId(),
        addesc:ad.getDescription1(),
        adsta1:adState,
        adsta2:urlMap[lastUrl].content + " " + adNewState,
        adchanged:adChanged,
        adhttp:lastUrl,
        adresponse:urlMap[lastUrl].response
      });
    }
  }
  info(totalNumEntities + ' elements processed for account ' + accountName);
  
  return results;
}


/**
 * Enables or Disables the Ad Status
 * @param {object} Ad entity object
 * @return {none}
 */
function changeAdStatus(adEntity){
  if (adEntity.isEnabled()) {
    info('  Ad with id ' + adEntity.getId() + ' will be paused');
    adEntity.pause();
  } else if (adEntity.isPaused()) {
    info('  Ad with id ' + adEntity.getId() + ' will be enabled');
    adEntity.enable();
  }
}


/**
 * Validates the status (HTML response code) and HTML data with the Adword's URL.
 * @param {string} adsUrl The Adword's URL.
 * @return {array} The responseCode and content (0,1,2) in JSON format.
 */
function fetchURL(adsUrl){
  var result = {};
  var now = new Date().getTime();
  var responseCode = 500;
  var response;
  try {
    response = UrlFetchApp.fetch(adsUrl, {muteHttpExceptions: true});
    responseCode = response.getResponseCode();
  } catch (e) {
    // Something went wrong. Since this a script error, let's mark it as 500
    warn(e.message);
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
 * Send an email with the Spread Sheets URL details for the email(s) defined
 * @param {array} Array with the results in JSON format
 * @return {none}.
 */
function reportResults(results){
  info('Generating spreadsheet report');
  var spreadSheets = copySpreadsheets(CONFIG_SPREADSHEETS_URL, REPORT_PREFIX + getCurrentDate("dd-MM-yyyy"));
  var spreadSheet = spreadSheets.getSheetByName(CONFIG_SPREADSHEET_NAME);
  var processStartTime = spreadSheet.getRange('H10').getValue();

  var summaryEmailData = [];
  
  for(var i in results) {
    if(!results[i].getReturnValue()) { continue; }
    
    var res = JSON.parse(results[i].getReturnValue());
    info('Reporting data for account ' + res.accountId + ' ' + res.accountName);
    var accountResults = writeAccountDataToSpreadsheet(spreadSheets, res);
    writeReportSummary(spreadSheets, res, accountResults);
    
    summaryEmailData.push({accountId:res.accountId,
                           accountName:res.accountName,
                           adsCount:res.adsCount,
                           adsProcessed:res.adsProcessed,
                           adsChanged:accountResults.adsChanged.length,
                           sheetUrl:accountResults.spreadSheetUrl});
    
    if (accountResults.adsChanged.length > 0){
      info(accountResults.adsChanged.length + ' ads were changed for the account ' + res.accountName);
    }
  }

  if(summaryEmailData.length > 0) {
    spreadSheet.getRange('H11').setValue( getCurrentDate('dd/MM/yyyy HH:mm:ss') );
    var processEndTime = spreadSheet.getRange('H11').getValue();
  
    var file = DriveApp.getFileById(spreadSheets.getId());
    info('Sharing the SpreadSheets file with Id: ' + spreadSheets.getId());
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    }
    
    var subject = SUBJECT_EMAIL + getCurrentDate("dd-MM-yyyy");
    var emailMsg = createSummaryHTMLEmail(subject, spreadSheets.getUrl(), summaryEmailData);
    var options = { htmlBody : emailMsg };
    info('Sending email report results');
    for (var i in RECIPIENT_EMAIL){
      MailApp.sendEmail(RECIPIENT_EMAIL[i], subject, subject, options);
      info('Email report results send to: ' + RECIPIENT_EMAIL[i]);
    }
  }
}


/**
 * Writes the account data records in its SpreadSheet report
 * @param {SpreadSheets,array} SpreadSheets object with the report, Array with the data records by account
 * @return {array} Array with the summary data (totals) by account
 */
function writeAccountDataToSpreadsheet(spreadSheets, res) {
  var spreadSheet = spreadSheets.getSheetByName(res.accountId);
  if(!spreadSheet) {
    spreadSheet = spreadSheets.insertSheet(res.accountId, spreadSheets.getSheets().length);
  }
  var adsChanged = [];
  
  var toWrite = [['CAMPAÑA','CAMPAÑA ID','ADWORD ID','ADWORD DESC','ADWORD ESTADO','ADWORD ESTADO','CAMBIO','URL','CODE']];
  for(var i in res.adsResults) {
    var row = res.adsResults[i];
    toWrite.push([row.campname,
                  row.campiden,
                  row.adiden,
                  row.addesc,
                  row.adsta1,
                  row.adsta2,
                  row.adchanged,
                  row.adhttp,
                  row.adresponse]);
    if (row.adchanged==1) {
      adsChanged.push({campId:row.campiden,adGrpId:row.adgrpiden,adsId:row.adiden,adsAct:row.adsta1,adsNvo:row.adsta2});
    }
  }
  
  var lastRow = spreadSheet.getLastRow();
  var numRows = spreadSheet.getMaxRows();

  var range = spreadSheet.getRange(lastRow+1,1,toWrite.length,toWrite[0].length);
  range.setValues(toWrite);
  if((spreadSheet.getMaxColumns() - spreadSheet.getLastColumn()) > 0) {
    spreadSheet.deleteColumns(spreadSheet.getLastColumn()+1, spreadSheet.getMaxColumns() - spreadSheet.getLastColumn());
  }
  
  return {spreadSheetUrl:spreadSheets.getUrl() + '#gid=' + spreadSheet.getSheetId(), adsChanged:adsChanged};
}


/**
 * Writes the summary data (totals) in the SpreadSheets report
 * @param {SpreadSheets,array,array} SpreadSheets object with the report, Array with the results by account, Array with totals by account
 * @return {none}
 */
function writeReportSummary(spreadSheets, res, accountResults){
  var spreadSheet = spreadSheets.getSheetByName(CONFIG_SPREADSHEET_NAME);
  
  for (var i in res){
    var row = 2;
    var accountIdInCell = spreadSheet.getRange('M' + row).getValue();
    while (accountIdInCell != "") {    
      if (res.accountId == accountIdInCell) {
      spreadSheet.getRange('O' + row).setFormula('=HYPERLINK("' 
                                                   + accountResults.spreadSheetUrl + '","Hoja ' + res.accountId + '")');
      spreadSheet.getRange('P' + row).setValue(res.processStartTime);
      spreadSheet.getRange('Q' + row).setValue(res.processEndTime);
      spreadSheet.getRange('R' + row).setValue(res.accountProcessed);
      spreadSheet.getRange('S' + row).setValue(res.adsCount);
      spreadSheet.getRange('T' + row).setValue(res.adsProcessed);
      spreadSheet.getRange('U' + row).setValue(accountResults.adsChanged.length);
        break;
      }
      row++;
      accountIdInCell = spreadSheet.getRange('M' + row).getValue();
    }
  }
}


/**
 * Creates the HTML layout for the email based in the summary email data
 * @param {string,array} Subject text used in the email, array with the summary email data foreach account
 * @return {string} The HTML layout for the email
 */
 function createSummaryHTMLEmail(subject, spreadSheetsUrl, summaryEmailData) {
  var body = subject;
  var cssStyle = '*{margin:0;padding:0;box-sizing:border-box}table{color:#333;font-family:sans-serif;font-size:.9em;font-weight:300;text-align:left;line-height:40px;border-spacing:0;border:1px solid #428bca;width:500px;margin:20px auto}thead tr:first-child{background:#428bca;color:#fff;border:none}th{font-weight:700}td:first-child,th:first-child{padding:0 15px 0 20px}thead tr:last-child th{border-bottom:2px solid #ddd}tbody tr:hover{background-color:#f0fbff}tbody tr:last-child td{border:none}tbody td{border-bottom:1px solid #ddd}td:last-child{text-align:right;padding-right:10px}.button{color:#696969;padding-right:5px;cursor:pointer}.alterar:hover{color:#428bca}.excluir:hover{color:#dc2a2a}';
  var htmlBody = '<html><style>' + cssStyle + '</style><body><a href="'+ spreadSheetsUrl +'">' + body + '</a>';
  htmlBody += '<br/ ><br/ >';
  htmlBody += '<table border="0" width="95%">';
  htmlBody += '<thead><tr>';
  htmlBody += '<th align="left">#</th>';
  htmlBody += '<th align="left">CUENTA</th>';
  htmlBody += '<th align="center">ADS</th>';
  htmlBody += '<th align="center">PROCESADOS</th>';
  htmlBody += '<th align="center">CAMBIOS</th>';
  htmlBody += '</tr></thead><tbody>';
  var numAccount = 1;
  var adsChanged = 0;
  for(var i in summaryEmailData) {
    var row = summaryEmailData[i];
    htmlBody += '<tr><td align="left">'+ numAccount++ +
      '</td><td align="left"><a href="'+ row.sheetUrl +'">' + row.accountId + ' - ' + row.accountName + '</a>' +
      '</td><td align="right">' + formatStringToNumber(row.adsCount, false) + 
      '</td><td align="right">' + formatStringToNumber(row.adsProcessed, false) + 
      '</td><td align="right">' + formatStringToNumber(row.adsChanged, false) + 
      '</td></tr>';
    adsChanged = adsChanged + row.adsChanged;
  }
  htmlBody += '</tbody></table>';
  htmlBody += '<br/ >';
  htmlBody += getCurrentDate('MMMM dd, yyyy @ hh:mma z');
  htmlBody += '<br/ >Procesadas : ' + Object.keys(summaryEmailData).length + ' cuentas ';
  htmlBody += 'con: ' + adsChanged + ' cambios de Ads';
  htmlBody += '<br/ ><br/ >Hecho por : <a href="http://www.walmart.com.mx">Walmart México</a>.';
  htmlBody += '</body></html>';
  
  return htmlBody;
}


/**
 * Retrieves the spreadsheets copied identified by the URL.
 * @param {string} spreadsheetsUrl The URL of the spreadsheet.
 * @return {SpreadSheet} The spreadsheet.
 */
function copySpreadsheets(spreadsheetsUrl, newSpreadSheetsName) {
  info('Copying spreadsheets document from ' + spreadsheetsUrl);
  return SpreadsheetApp.openByUrl(spreadsheetsUrl).copy(newSpreadSheetsName);
}

/**
 * Retrieves the spreadsheets identified by the URL.
 * @param {string} spreadsheetsUrl The URL of the spreadsheet.
 * @return {SpreadSheet} The spreadsheet.
 */
function openSpreadsheets(spreadsheetsUrl) {
  info('Reading spreadsheets document from ' + spreadsheetsUrl);
  return SpreadsheetApp.openByUrl(spreadsheetsUrl);
}


/**
 * Retrieves the current date and time in the format requested
 * @param {string} format, date and time format requested
 * @return {string} The current date and time formatted
 */
function getCurrentDate(format) { return Utilities.formatDate(new Date(), AdWordsApp.currentAccount().getTimeZone(), format); }

function formatStringToNumber(numValue,isCurrency){
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
function error(msg) { if(LOG_LEVELS['error'] <= LOG_LEVELS[LOG_LEVEL]) { log('ERROR',msg); } }
function warn(msg)  { if(LOG_LEVELS['warn']  <= LOG_LEVELS[LOG_LEVEL]) { log('WARN' ,msg); } }
function info(msg)  { if(LOG_LEVELS['info']  <= LOG_LEVELS[LOG_LEVEL]) { log('INFO' ,msg); } }
function debug(msg) { if(LOG_LEVELS['debug'] <= LOG_LEVELS[LOG_LEVEL]) { log('DEBUG',msg); } }
function log(type,msg) { Logger.log(type + ' - ' + msg); }
}
