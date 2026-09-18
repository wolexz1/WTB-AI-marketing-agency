const CONFIG = {
  prospectSheet: 'Prospects',
  activitySheet: 'Activity',
  sentLabel: 'WTB / Backlinks / Sent',
  replyLabel: 'WTB / Backlinks / Replies',
  weeklyLimit: 5,
  followUpAfterDays: 6
};

const HEADERS = [
  'ID', 'Publication', 'Contact', 'Email', 'Contact source', 'Verified on',
  'Approval', 'Status', 'Subject', 'First email', 'Follow-up email',
  'First sent', 'Follow-up sent', 'Reply seen', 'Notes', 'Last updated'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('WTB outreach')
    .addItem('Set up cloud automation', 'setUp')
    .addItem('Run approved outreach now', 'runWeeklyOutreach')
    .addItem('Check for publisher replies', 'checkPublisherReplies')
    .addToUi();
}

function setUp() {
  ensureStructure();
  removeManagedTriggers();
  ScriptApp.newTrigger('runWeeklyOutreach')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.WEDNESDAY)
    .atHour(10)
    .create();
  ScriptApp.newTrigger('checkPublisherReplies')
    .timeBased()
    .everyDays(1)
    .atHour(11)
    .create();
}

function runWeeklyOutreach() {
  const sheet = getProspectSheet();
  const rows = getRows(sheet);
  const now = new Date();
  let initialSent = 0;
  let followUpsSent = 0;

  rows.forEach((row) => {
    if (initialSent >= CONFIG.weeklyLimit || row.status !== 'QUEUED') return;
    if (row.approval !== 'APPROVED' || !row.email || !row.verifiedOn || !row.firstEmail || !row.subject) return;
    sendEmail(row.email, row.subject, row.firstEmail);
    updateRow(sheet, row.index, { status: 'SENT', firstSent: now, lastUpdated: now });
    labelLatestSentThread(row.email, row.subject);
    logActivity(row, 'Initial personalised outreach sent');
    initialSent += 1;
  });

  getRows(sheet).forEach((row) => {
    if (followUpsSent >= CONFIG.weeklyLimit || row.status !== 'SENT') return;
    if (row.replySeen || row.followUpSent || !row.firstSent || !row.followUpEmail) return;
    if (daysSince(row.firstSent, now) < CONFIG.followUpAfterDays) return;
    sendEmail(row.email, 'Following up: ' + row.subject, row.followUpEmail);
    updateRow(sheet, row.index, { followUpSent: now, lastUpdated: now });
    labelLatestSentThread(row.email, row.subject);
    logActivity(row, 'One permitted follow-up sent');
    followUpsSent += 1;
  });

  logRun('Weekly run complete: ' + initialSent + ' initial pitch(es), ' + followUpsSent + ' follow-up(s).');
}

function checkPublisherReplies() {
  const sheet = getProspectSheet();
  const ownerEmail = Session.getEffectiveUser().getEmail().toLowerCase();
  getRows(sheet).forEach((row) => {
    if (row.status !== 'SENT' || row.replySeen || !row.email) return;
    const threads = GmailApp.search('from:(' + row.email + ') newer_than:90d');
    if (!threads.length) return;
    const replyLabel = GmailApp.getUserLabelByName(CONFIG.replyLabel) || GmailApp.createLabel(CONFIG.replyLabel);
    threads.forEach((thread) => replyLabel.addToThread(thread));
    updateRow(sheet, row.index, { replySeen: new Date(), status: 'REPLIED', lastUpdated: new Date() });
    logActivity(row, 'Publisher reply found and labelled for direct handling');
  });
  if (!ownerEmail) logRun('Reply scan completed. Gmail account ownership could not be read, but matching publisher replies were labelled.');
}

function ensureStructure() {
  const spreadsheet = SpreadsheetApp.getActive();
  let prospects = spreadsheet.getSheetByName(CONFIG.prospectSheet);
  if (!prospects) prospects = spreadsheet.insertSheet(CONFIG.prospectSheet);
  if (prospects.getLastRow() === 0) prospects.appendRow(HEADERS);
  prospects.setFrozenRows(1);
  prospects.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#071b46').setFontColor('#ffffff');
  prospects.autoResizeColumns(1, HEADERS.length);
  let activity = spreadsheet.getSheetByName(CONFIG.activitySheet);
  if (!activity) activity = spreadsheet.insertSheet(CONFIG.activitySheet);
  if (activity.getLastRow() === 0) activity.appendRow(['Timestamp', 'Publication', 'Email', 'Action']);
}

function removeManagedTriggers() {
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (['runWeeklyOutreach', 'checkPublisherReplies'].indexOf(trigger.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(trigger);
  });
}

function getProspectSheet() {
  ensureStructure();
  return SpreadsheetApp.getActive().getSheetByName(CONFIG.prospectSheet);
}

function getRows(sheet) {
  const values = sheet.getDataRange().getValues();
  const headerIndex = {};
  values[0].forEach((header, index) => headerIndex[header] = index);
  return values.slice(1).map((values, index) => ({
    index: index + 2,
    id: values[headerIndex['ID']], publication: values[headerIndex['Publication']], email: String(values[headerIndex['Email']] || '').trim(),
    verifiedOn: values[headerIndex['Verified on']], approval: String(values[headerIndex['Approval']] || '').trim().toUpperCase(),
    status: String(values[headerIndex['Status']] || '').trim().toUpperCase(), subject: values[headerIndex['Subject']],
    firstEmail: values[headerIndex['First email']], followUpEmail: values[headerIndex['Follow-up email']],
    firstSent: values[headerIndex['First sent']], followUpSent: values[headerIndex['Follow-up sent']], replySeen: values[headerIndex['Reply seen']]
  }));
}

function updateRow(sheet, rowNumber, updates) {
  const columnByField = { status: 8, firstSent: 12, followUpSent: 13, replySeen: 14, lastUpdated: 16 };
  Object.keys(updates).forEach((field) => sheet.getRange(rowNumber, columnByField[field]).setValue(updates[field]));
}

function sendEmail(email, subject, body) {
  GmailApp.sendEmail(email, subject, body, { name: 'WTB AI Marketing Agency' });
}

function labelLatestSentThread(email, subject) {
  Utilities.sleep(1000);
  const threads = GmailApp.search('in:sent to:(' + email + ') subject:(' + subject + ') newer_than:1d', 0, 1);
  const sentLabel = GmailApp.getUserLabelByName(CONFIG.sentLabel);
  if (threads.length && sentLabel) sentLabel.addToThread(threads[0]);
}

function logActivity(row, action) {
  SpreadsheetApp.getActive().getSheetByName(CONFIG.activitySheet).appendRow([new Date(), row.publication, row.email, action]);
}

function logRun(action) {
  SpreadsheetApp.getActive().getSheetByName(CONFIG.activitySheet).appendRow([new Date(), '', '', action]);
}

function daysSince(date, now) {
  return Math.floor((now.getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}
