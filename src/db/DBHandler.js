import fs from 'fs';
import path from 'path';
import { prettifyDuration, dbg } from './../util';
import Database from 'better-sqlite3';
import moment from 'moment';

// *** DBHandler ***
// Communicates with the database. Utilizes better-sqlite3.
export default class DBHandler {
  constructor (dbPath, dbFileName) {
    // Absolute database folder path
    this.dbPath = dbPath;
    // Database filename
    this.dbFileName = dbFileName;
    // Did the database already exist before creation?
    this.dbAlreadyExisted = fs.existsSync(path.join(this.dbPath, this.dbFileName));
    // Database object
    this.db = new Database(path.join(this.dbPath, this.dbFileName));
    // If db was not present, create appropriate tables
    if (!this.dbAlreadyExisted) this.init();

    // Prepared sql statements for inserting a single tuple to any table
    this.insertUser = this.db.prepare('INSERT INTO user (userID, userName, currPay, state) VALUES (?, ?, ?, ?)');
    this.insertPoo = this.db.prepare('INSERT INTO poo (userID, start, finish, duration, pay, val, form) VALUES (?, ?, ?, ?, ?, ?, ?)');
    this.insertGroup = this.db.prepare('INSERT INTO group_chat (chatID) VALUES (?)');
    this.linkUserGroup = this.db.prepare('INSERT INTO user_in_group (userID, chatID) VALUES (?, ?)');
  }

  /* Initialize database. Creates appropriate tables etc. */
  init() {
    const initQuery = path.join(this.dbPath, 'init.sql')
    this.runSQL(initQuery)
  }

  // Is the given user ID present in the database?
  userExists (userID) {
    const q = this.db.prepare('SELECT EXISTS(SELECT 1 FROM user WHERE userID = ?) AS result');
    return q.get(userID).result === 1;
  }

  // Sum of all poo values for a given user
  netWorth (userID, num) {
    const q = num
      ? this.db.prepare('SELECT SUM(val) AS result FROM poo WHERE userID = ? LIMIT ?')
      : this.db.prepare('SELECT SUM(val) AS result FROM poo WHERE userID = ?');
    const res = num
      ? q.get(userID, num).result
      : q.get(userID).result;
    return res ? res.toFixed(2) : 0;
  }

  // Get statistics of last n poos
  lastPoos (userID, num) {
    const n = Math.min(10, num);
    const q = this.db.prepare('SELECT * FROM poo WHERE userID = ? ORDER BY start LIMIT ?');
    const qres =  q.iterate(userID, n);
    const res = [];
    let value = 0;
    for (const line of qres) {
      res.push(
        `<code>${moment(line.start).format('DD/MM/YYYY HH:mm:ss')}: ` +
        `${prettifyDuration(moment.duration(line.duration))}` +
        `/ ${line.val.toFixed(2)}€</code>`
      );
      value += line.val;
    }
    return [res.join('\n'), value.toFixed(2), res.length];
  }

  // The amount of total poos for a given user
  pooCount (userID) {
    const q = this.db.prepare('SELECT count(*) AS result FROM poo WHERE userID = ?');
    return q.get(userID).result;
  }

  // Register a user
  addUser (id, name, p, s) {
    this.insertUser.run(id, name, p, s);  
  }

  // Register a poo
  addPoo (id, s, f, d, p, v) {
    if(this.userExists(id)) {
      this.insertPoo.run(id, s, f, d, p, v);
    }
  }

  // Register a group chat
  addGroup (id) {
    this.insertGroup.run(id);
  }

  getPoos (userID) {
    const q = this.db.prepare('SELECT * FROM poo WHERE userID = ?');
    return q.all(userID);
  }

  // Add a poo
  // TODO:
  // - Standardize more: move queries to constructor, use predefined methods (this.Addpoo) etc.
  startPoo (userID) {
    if(!this.userIsPerforming(userID)) {
      const q = this.db.prepare('INSERT INTO poo VALUES (?, ?, NULL, NULL, ?, NULL, 0)');
      const now = moment().utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
      const pay = this.getWage(userID);
      q.run(userID, now, pay);
      this.setPooState(1, userID);
      return true;
    } else return false;
  }

  // End a poo
  // TODO:
  // - Add debug logging: print out saved start, end and duration
  // - Make less ugly
  endPoo (userID) {
    if(this.userIsPerforming(userID)) {
      const s = this.getLastPooStart(userID);
      const durationMoment = moment.duration(moment().diff(s));
      const duration = moment.utc(durationMoment.asMilliseconds()).format("HH:mm:ss.SSS");
      const wage = this.getWage(userID);
      const value = durationMoment.asHours() * wage;
      const end = s.add(durationMoment).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
      const q = this.db.prepare('UPDATE poo SET finish = ?, duration = ?, val = ?, pay = ? WHERE userID = ? AND finish IS NULL');
      q.run(end, duration, value, wage, userID);
      this.setPooState(0, userID);
      return durationMoment
    } else return null;
  }

  // Get the start of the current ongoing poo session for a given user

  getLastPooStart (userID) {
    const q = this.db.prepare('SELECT start AS result FROM poo WHERE userID = ? AND finish IS NULL');
    return moment.utc(q.get(userID).result);
  }

  // Is a given user registered to a given group?
  groupHasUser (gid, uid) {
    const q = this.db.prepare('SELECT EXISTS (SELECT 1 FROM user_in_group WHERE userID = ? AND chatID = ?) AS result');
    return q.get(uid, gid).result === 1;
  }

  // Link a given user to a given group
  linkUserToGroup (uid, gid) {
    this.linkUserGroup.run(uid, gid);
  }

  // What members are currently linked to a given group?
  getGroupUsers (gid) {
    const q = this.db.prepare('SELECT userID FROM user_in_group WHERE chatID = ?');
    return q.all(gid).map(obj => obj.userID);
  }

  // Depending on if the chat is a groupchat, remove the user from said group or remove all user data entirely
  nuke (userID, chatID, group) {
    if(group) {
      const q = this.db.prepare('DELETE from user_in_group WHERE userID = ? AND chatID = ?')
      q.run(userID, chatID);
    }
    else {
      const q1 = this.db.prepare('DELETE from user_in_group WHERE userID = ?');
      const q2 = this.db.prepare('DELETE from poo WHERE userID = ?');
      const q3 = this.db.prepare('DELETE from user WHERE userID = ?');
      q1.run(userID); q2.run(userID); q3.run(userID);
    }
  }

  // Retrieve the state field for a given user
  // 0: no wage set
  // 1: wage set
  //
  userState (userID) {
    const q = this.db.prepare('SELECT state AS result FROM user WHERE userID = ?');
    return q.get(userID).result;
  }

  // Poostate
  // Retrieve the pooState field for a given user
  // 0: Not doing anything
  // 1: Pooing
  userPooState (userID) {
    const q = this.db.prepare('SELECT pooState AS result FROM user WHERE userID = ?');
    const res = q.get(userID)
    return res ? res.result : -1;
  }

  // Does the user have an ongoing (poo) session?
  // (is the pooState set to 1?)
  // TODO:
  // - Implement this in a smarter way?
  // - Add support for possible different session types in the future
  userIsPerforming (userID) {
    return this.userPooState(userID) === 1;
  }

  // Set the poo state for a given user
  setPooState (state, userID) {
    const q = this.db.prepare('UPDATE user SET pooState = ? WHERE userID = ?');
    q.run(state, userID);
  } 

  // Has the wage been set for a given user?
  // (is the state field set to 0?)
  // TODO:
  // - Implement this in a smarter way, possibly without using the state field?
  userHasNoWage (userID) {
    return this.userState(userID) == 0;
  }

  // Get the current wage for a given user
  getWage (userID) {
    const q = this.db.prepare('SELECT currPay AS result FROM user WHERE userID = ?');
    const res = q.get(userID)
    return res ? res.result : 0;
  }

  // Set the current wage for a given user
  updateWage (userID, pay) {
    const q = this.db.prepare('UPDATE user SET currPay = ?, state = 1 WHERE userID = ?');
    q.run(pay, userID);
  }

  // Retrieve the current wage for a given user
  getAdmins() {
    const q = this.db.prepare('SELECT userID AS result FROM user WHERE userGroup = 1');
    return q.all();
  }

  /* Method for running arbitrary sql files on the db.
     param sqlPath:   Absolute path to sql file
     returns:         Boolean value indicating whether execution was successful  */
  runSQL (sqlPath) {
    try {
      const file = fs.readFileSync(sqlPath, 'utf8')
      this.db.exec(file)
      return true
    } catch (error) {
      console.log(error)
    }
  }

  // Close db connection
  close () {
    this.db.close()
  }
}

export const exportPooPays = (handler, filepath, from) => {
  try {
    const userID = from.id
    const db = new Database(filepath);
    const q = db.prepare("SELECT * from poop");
    const res = q.all();
    let n = 0;
    for (const entry of res) {
      const date = moment(entry.DATELONG).utc();
      const s = date.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
      const worth = entry.MONEY;
      const durationMoment = moment.duration(entry.LENGTH);
      const duration = moment.utc(durationMoment.asMilliseconds()).format('hh:mm:ss.SSS')
      const wage = worth / durationMoment.asHours()
      const end = date.add(durationMoment).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");

      handler.insertPoo.run(userID, s, end, duration, wage, worth, 0)
      n++;
    }
    return n;
  } catch (err) {
    dbg(from,'Failed exporting PooPay file:\n' + err);
  }
  
}
