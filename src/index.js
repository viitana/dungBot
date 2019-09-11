import fs from 'fs';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import DBHandler, { exportPooPays } from './db/DBHandler.js';
import { prettifyDuration, missingTokenErr, isGroupChat, dbg } from './util';
import * as fetch from 'node-fetch';
import messages from './messages'

import { genLineChart } from './chart/chart'

require('dotenv').config()

const token = process.env.TGBOT_TOKEN;
if (!token) {
  console.error(missingTokenErr);
  process.exit();
}

const bot = new TelegramBot(token, { polling: true });

// Toggle for debug data printing
process.env.debug = true;

// Data directory path and db filename
const dbDir = 'src/db';
const dbName = 'poo.db';
const changeFile = "changes.log";

// Open db connection
console.log('\nOpening database connection to ' + path.join(dbDir, dbName));
const db = new DBHandler(dbDir, dbName);
if (db) {
  console.log((db.dbAlreadyExisted ? '' : 'File was not found, created a new database\n') + 'Successfully connected');
}

// Command: /start (private & group chat)
// - Add the user to the database if not aready added
// - Link to the current group chat if in one and not linked yet
bot.onText(/^\/start$/, (msg) => {
  try {
    const userID = msg.from.id;
    const userName = msg.from.username;
    const chatID = msg.chat.id;

    if(isGroupChat(msg.chat)) {
      if(db.groupHasUser(chatID, userID)) {
        bot.sendMessage(chatID, `You're already in the group, ${msg.from.first_name}...\nType /nuke to leave`);
      }
      else {
        dbg(msg.from, `Attempting to link to group ID ${chatID}`)
        db.linkUserToGroup(userID, chatID);
        bot.sendMessage(chatID, `${msg.from.first_name} is now part of the ${msg.chat.title} poosquad! 💩`);
      }
    }
    else { // Private chat
      if (!db.userExists(userID)) {
        dbg(msg.from, `Attempting to add user`)
        db.addUser(userID, userName, 0, 0);
        bot.sendMessage(chatID, `Let the dumping begin, ${msg.from.first_name}!`);
        setTimeout(() => bot.sendMessage(chatID, messages.intro, {parse_mode : "HTML"}), 500);
        setTimeout(() => bot.sendMessage(chatID, messages.commands, {parse_mode : "HTML", disable_web_page_preview : true}), 1000);
      }
      else {
        bot.sendMessage(chatID, `You're already registered, ${msg.from.first_name}!\nTo join groups, use this command in a grpup chat`);
      }
    }

    if (!db.userExists(userID)) {
      dbg(msg.from, `Attempting to add user`)
      db.addUser(userID, userName, 0, 0);
      bot.sendMessage(chatID, `Let the dumping begin, ${msg.from.first_name}!`);
      setTimeout(() => bot.sendMessage(chatID, messages.intro, {parse_mode : "HTML"}), 500);
      setTimeout(() => bot.sendMessage(chatID, messages.commands, {parse_mode : "HTML"}), 1000);
    }

    if (isGroupChat(msg.chat) && !db.groupHasUser) {
      dbg(msg.from, `Attempting to link to group ID ${chatID}`)
      db.linkUserToGroup(userID, chatID);
      bot.sendMessage(chatID, `${msg.from.first_name} is now part of the ${msg.chat.title} poosquad! 💩`);
    }
  } catch (err) {
    console.log(err);
  }
});

bot.onText(/^\/intro$/, msg => {
  if(!isGroupChat(msg.chat)) bot.sendMessage(msg.chat.id, messages.intro, {parse_mode : "HTML"})
});

bot.onText(/^\/commands$/, msg => {
  if(!isGroupChat(msg.chat)) bot.sendMessage(msg.chat.id, messages.commands, {parse_mode : "HTML", disable_web_page_preview : true})
});

bot.onText(/^\/poopays$/, msg => {
  if(!isGroupChat(msg.chat)) bot.sendMessage(msg.chat.id, messages.poopays, {parse_mode : "HTML", disable_web_page_preview : true})
});

bot.onText(/^\/graph$/, msg => {
try {
  const userID = msg.from.id;
  const chatID = msg.chat.id;
  let poos = [];
  if (!userMeetsReq(2, userID, msg.chat)) return;
  if(isGroupChat(msg.chat)) {
    const members = db.getGroupUsers(chatID) || [];
    for (const memberID of members) {
      poos = poos.concat(db.getPoos(memberID));
    }
  }
  else {
    poos = db.getPoos(userID);
  }
  genLineChart(msg, bot, poos, isGroupChat(msg.chat));
} catch (err) {
  console.log(err);
}
});

// Command: /poops (private & group chat)
// - Give the user's poo count and their total value
// TODO:
// - Give more statistics, possibly with various additional message/command parameters
// - Charts
bot.onText(/^\/poops$/, (msg) => {
  try {
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(2, userID, msg.chat)) return;
    const pooCount = db.pooCount(userID);
    const netWorth = db.netWorth(userID);
    bot.sendMessage(
      chatID,
      `Hey ${msg.from.first_name}! You've pooped a total of ${pooCount} times for a total of ${netWorth}€ worth!`
    );
  } catch (err) {
    console.log(err);
  }
});

// Command: /poops (private & group chat)
// - Give the user's poo count and their total value
// TODO:
// - Give more statistics, possibly with various additional message/command parameters
// - Charts
bot.onText(/^\/stats( *)(\d*)$/, (msg, match) => {
  try {
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(2, userID, msg.chat)) return;
    let n = parseFloat(match[2]);
    if (isNaN(n)) {
      n = 10;
    }
    const [poos, total, count] = db.lastPoos(userID, n);
    const avg = count ? (total/count).toFixed(2) : 0;
    const reply = `Last ${count} poos for ${msg.from.first_name}:\n${poos}\nTotal worth: ${total}€\nAvg: ${avg}€`;
    bot.sendMessage(chatID, reply, {parse_mode : "HTML"});
  } catch (err) {
    console.log(err);
  }
});

// Command: /startpoo (private chat)
// - Start a poo session for the user if not already in session
// - Add a poo entry in the database with nulled end, duration and value fields
bot.onText(/^\/startpoo$/, (msg) => {
  try {
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(2, userID, msg.chat)) return;
    if (isGroupChat(msg.chat)) {
      bot.sendMessage(
        chatID,
        `Submit your excretions in the private chat, ${msg.from.first_name}`
      );
    } else {
      const success = db.startPoo(userID);
      bot.sendMessage(chatID, success ? 'New poop started. Bombs away!' : "You're already performing!");
    }
  } catch (err) {
    console.log(err);
  }
});

// Command: /endpoo (private chat)
// - End the user's poo session if in one
// - Find the latest poo entry, calculates duration from start and updates fields accordingly
bot.onText(/^\/endpoo$/, (msg) => {
  try {
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(2, userID, chatID)) return;
    if (isGroupChat(msg.chat)) {
      bot.sendMessage(
        chatID,
        `Submit your excretions in the private chat, ${msg.from.first_name}`
      );
    } else {
      const duration = db.endPoo(userID);
      if (duration) bot.sendMessage(chatID, `Target destroyed. Total duration:\n${prettifyDuration(duration)}`);
      else bot.sendMessage(chatID, `You have no ongoing bombings, ${msg.from.first_name}`);
    }
  } catch (err) {
    console.log(err);
  }
});

// Command: /wage <number>
// - Update the user's wage, regardless of whether already set
bot.onText(/^\/wage( *)(\d*)$/, (msg, match) => {
  try {
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    if (!userMeetsReq(1, userID, msg.chat)) return;
    const wage = parseFloat(match[2]);
    dbg(msg.from, `Attepting to set wage to ${wage}`)
    if (!isNaN(wage)) {
      db.updateWage(userID, wage);
      bot.sendMessage(chatID, `Your hourly wage is now set to ${wage}€`);
    } else {
      bot.sendMessage(chatID, 'Invalid number');
    }
  } catch (err) {
    console.log(err);
  }
});

bot.onText(/^\/nuke( *)(\d*)$/, (msg, match) => {
  try {
    console.log(msg)
    const userID = msg.from.id;
    const chatID = msg.chat.id;
    const group = isGroupChat(msg.chat);
    if (!userMeetsReq(1, userID, msg.chat)) return;
    if(group) {
      //if (db.groupHasUser(chatID, userID))
      dbg(msg.from, `Removing from group ${msg.chat.title} (ID ${msg.chat.id})`)
      db.nuke(userID, chatID, group);
      bot.sendMessage(
        chatID,
        `${msg.from.first_name} is now removed from the ${msg.chat.title} poosquad :(` +
        '\nIf you want to permanently remove all your poo data, send the command in private and follow the instructions.'
      );
      return;
    }

    const id = parseInt(match[2]);

    if(id === userID) {
      dbg(msg.from, 'Nuking')
      db.nuke(userID, chatID, group);
      bot.sendMessage(chatID, "Data cleared")
    } else {
      dbg(msg.from, `Invalid nuke attempt, given id: ${id}`)
      bot.sendMessage(
        chatID,
        'You are attempting to nuke all your user/pooping data from all chats permanently. ' +
        'To confirm, repeat the command with your unique ID as follows:\n' +
        `'/nuke ${msg.from.id}'`
        );
    }
    
  } catch (err) {
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
const userMeetsReq = (stage, userID, chat) => {
  try {
    const group = isGroupChat(chat);
    if (stage >= 0 && !db.userExists(userID)) { // Say /start first
      bot.sendMessage(chat.id, 'Type /start first to start the bombing!\nAlternatively, type /commands to see the available commands');
      return false;
    }
    if (stage >= 1 && (group && !db.groupHasUser(chat.id, userID))) {  // Say /start in new group chat first
      bot.sendMessage(chat.id, 'Say <code>/start</code> in this chat first to join the poo-squad!', {parse_mode : "HTML"})
      return false;
    }
    if (stage >= 2 && db.userHasNoWage(userID)) { // No wage set'
      bot.sendMessage(chat.id, group ? 'Please private message me your hourly pay.' : 'Please give me your hourly pay.');
      return false;
    }
    return true;
  } catch (err) {
    console.log(err);
  }
}

const handleRepoChanges = () => {
  try {
    const changes = fs.readFileSync(changeFile, 'utf8')
    console.log(db.getAdmins())
  } catch (error) {
    console.log(error)
  }
}

// Receive external PooPays db files and attempt to export if valid
bot.on("message", msg => {
  if (msg.document) {
    const doc = msg.document;
    if (doc.file_name === "poop"
      && doc.file_size < 100240
      && doc.mime_type === 'application/x-sqlite3') {



      try {
        bot.getFile(doc.file_id)
          .then(async fileURI => {

            try {
              const relativeDir = `src/files/${msg.from.id}`
              const fileName = `pooPaysData.db`;

              fs.mkdir(relativeDir, { recursive: true }, err => dbg(msg.from, err));
              const url = `https://api.telegram.org/file/bot${token}/${fileURI.file_path}`

              const res = await fetch(url);
              const fileStream = fs.createWriteStream(path.join(relativeDir, fileName));
              
              await new Promise((resolve, reject) => {
                res.body.pipe(fileStream);
                res.body.on("error", err => {
                  reject(err);
                });
                fileStream.on("finish", () => {
                  dbg(msg.from, `Successful file save to ${fileStream.path} (${doc.file_size} bytes)`);
                  const n = exportPooPays(db, fileStream.path, msg.from);
                  dbg(msg.from, `Successful PooPays export of ${n} entries (${fileStream.path})`);
                  bot.sendMessage(msg.chat.id, `Successfully imported ${n} entries`);
                  resolve();
                });

              });
            } catch (error) {
                bot.sendMessage(msg.chat.id, 'Failed to parse file');
            }
          })
        } catch (error) {
          dbg(msg.from, `Failed to receive file ${doc.file_name}  (${doc.file_size} bytes)`);
        }
    } else {
      dbg(msg.from, `Received invalid file "${doc.file_name}": ${doc.file_id} (${doc.file_size} bytes)`);
      bot.sendMessage(msg.chat.id, "I only accept valid PooPays database files under 100KiB!\nMake sure you've sent the right one.")
    }
  }
})

