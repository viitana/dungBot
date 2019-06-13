const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const DBHandler = require('./db/DBHandler.js')

const token = process.env.TGBOT_TOKEN;
if(!token) {
  console.error('*** BOT TOKEN NOT FOUND ***\n* If trying to run officially, ask Atte for token\n* Otherwise generate your own via @BotFather\nExiting');
  process.exit();
}

const bot = new TelegramBot(token, {polling: true});

// Toggle for debug data printing
const debug = false;

// Data directory path and db filename
const dbDir = 'db';
const dbName = 'poo.db';
const groupChatTypes = ['group', 'supergroup', 'channel'];

// Open db connection
console.log('Opening database connection to ' + path.join(dbDir, dbName));
const db = new DBHandler(dbDir, dbName);
console.log(db.dbAlreadyExisted ? 'Successfully connected' : 'File was not found, created a new database');

// Is a chat a groupchat?
const isGroupChat = (chatID) => groupChatTypes.includes(bot.getChat(chatID).type);

// Format a moment duration to a nice-ish string
const prettifyDuration = (duration) => {
  let str = '';
  const d = duration.days();
  const h = duration.hours();
  const m = duration.minutes();
  const s = duration.seconds();
  const ms = duration.milliseconds();
  if(d && d > 0) str += d + ' days ';
  if(h && h > 0) str += h + ' hours ';
  if(m && m > 0) str += m + ' minutes ';
  if(s && s > 0) str += s + ' seconds ';
  if(ms && ms > 0) str += ms + ' millisedonds ';
  return str;
}

// Command: /start (private & group chat)
// - Add the user to the database if not aready added
// - Link to the current group chat if in one and not linked yet
// TODO:
// - Add poo emoji because why not, unicode u'\U0001F4A9'
bot.onText(/\/start$/, (msg) => {
  try {
    const userID = msg.from.id;
    const userName = msg.from.username;
    const chatID = msg.chat.id;

    if(!db.userExists(userID)) {
      if(debug) console.log('User ' + userID + ': Attempting to add user');
      existed = false;
      db.addUser(userID, userName, 0, 0);
      bot.sendMessage(chatID, 'Let the dumping begin, ' + msg.from.first_name + '!'); // u'\U0001F4A9'
    }

    if(isGroupChat(chatID) && !db.groupHasUser) {
      if(debug) console.log('User ' + userID + ': Attempting to link user to group (ID ' + chatID + ')');
      db.linkUserToGroup(userID, chatID);
      bot.sendMessage(chatID, msg.from.first_name + ' is now part of the ' + msg.chat.title + ' poosquad!'); // u'\U0001F4A9'
    }
  } catch(err) {
    console.log(err);
  }
});

// Command: /poops (private & group chat)
// - Give the user's poo count and their total value
// TODO:
// - Give more statistics, possibly with various additional message/command parameters
// - Charts
bot.onText(/\/poops/, (msg) => {
  try{
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(2, userID, chatID)) return;
    const pooCount = db.pooCount(userID);
    const netWorth = db.netWorth(userID) ? db.netWorth(userID) : 0;
    bot.sendMessage(
      chatID,
      'Hey ' + msg.from.first_name +
      "! You've pooped a total of " + pooCount +
      ' times for a total of ' + netWorth + '€ worth!'
    );
  } catch(err) {
    console.log(err);
  }
});

// Command: /startpoo (private chat)
// - Start a poo session for the user if not already in session
// - Add a poo entry in the database with nulled end, duration and value fields
bot.onText(/\/startpoo/, (msg) => {
  try{
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(2, userID, chatID)) return;
    if (isGroupChat(chatID)) {
      bot.sendMessage(
        chatID,
        'Submit your excretions in the private chat, ' + msg.from.first_name + '!'
        );
    } else {
      const success = db.startPoo(userID);
      bot.sendMessage(chatID, success ? 'New poop started. Bombs away!' : "You're already performing, "+msg.from.first_name+'!');
    }
  } catch(err) {
    console.log(err);
  }
});

// Command: /endpoo (pricate chat)
// - End the user's poo session if in one
// - Find the latest poo entry, calculates duration from start and updates fields accordingly
bot.onText(/\/endpoo/, (msg) => {
  console.log('/endpoo');
  try{
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(2, userID, chatID)) return;
    if (isGroupChat(chatID)) {
      bot.sendMessage(
        chatID,
        'Submit your excretions in the private chat, ' + msg.from.first_name + '!'
        );
    } else {
      const duration = db.endPoo(userID);
      if(duration) bot.sendMessage(chatID, 'Target destroyed. Total duration:\n' + prettifyDuration(duration));
      else bot.sendMessage(chatID, 'You have no ongoing bombings, '+ msg.from.first_name + '.');
    }
  } catch(err) {
    console.log(err);
  }
});

// Command: /wage <number>
// - Update the user's wage, regardless of whether already set
bot.onText(/\/wage (.+)/, (msg, match) => {
  try {
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(1, userID, chatID)) return;
    const wage = match[1];
    if(debug) console.log('User ' + userID + ': Attepting to set wage to ' + wage);
    if(!isNaN(parseFloat(wage))) {
      let wageF = parseFloat(wage);
      db.updateWage(userID, wageF);
      bot.sendMessage(chatID, 'Your hourly wage has been successfully set to ' + wageF + '!');
    }
  } catch(err) {
    console.log(err);
  }
});

/**
 * Checks whether a user has been configured/ to some required state in a chat.
 * Higher states include requirements for all lower ones.
 * 
 * level 0:
 *   User has said /start in some chat (is initialized in the database)
 * level 1:
 *   If the chat is a group chat the user has said /start in it too (is linked to the groupchat)
 * level 2:
 *   The user has configured his wage using /wage <amount>
 * 
 * @param {int} stage Requirement level
 * @param {string} userID User ID
 * @param {string} chatID Chat ID
 * @return {boolean} Whether the user is not configured up to the required state
 */
const userMeetsReq = (stage, userID, chatID) => {
  try {
    let notReady = false;
    if(stage >= 0 && !db.userExists(userID)) { // Say /start first
      console.log('  checked existence');
      bot.sendMessage(chatID, 'Say /start first to start the bonbing!');
      return false;
    }
    if(stage >= 1 && (isGroupChat(chatID) && !db.groupHasUser(chatID, groupID))) {  // Say /start in new group chat first
      console.log('  checked group existence');
      bot.sendMessage(chatID, 'Say /start in this chat first to join the poo-squad!')
      return false;
    }
    if(stage >= 2 && db.userHasNoWage(userID)) { // No wage set'
      if (isGroupChat(chatID)) bot.sendMessage(chatID, 'Please private message me your hourly pay.');
      else bot.sendMessage(chatID, 'Please give me your hourly pay.');
      console.log('checked wage existence')
      return false;
    }
    return true;
  } catch(err) {
    console.log(err);
  }
}
