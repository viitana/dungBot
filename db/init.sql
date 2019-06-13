CREATE TABLE user(
    userID INTEGER PRIMARY KEY,
    userName TEXT,
    currPay REAL,
    state INTEGER,
    pooState INTEGER
);

CREATE TABLE group_chat(
    chatID TEXT PRIMARY KEY
);

CREATE TABLE user_in_group(
  	userID INTEGER,
    chatID TEXT,
  	PRIMARY KEY (userID, chatID)
);

CREATE TABLE poo(
  	userID INTEGER,
    start TEXT,
  	finish TEXT,
  	duration TEXT,
  	pay REAL,
  	val REAL,
    form INTEGER,
    PRIMARY KEY(userID, start)
);
