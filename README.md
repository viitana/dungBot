# pooBot

A Telegram bot that tracks your employer's losses due to you pooping on company time. Brilliant.

Features include a proper persistent sqlite db, group chat integration, dynamic graph generation for single and group chats, data import from the similar [PooPays](https://play.google.com/store/apps/details?id=com.skiily.www.poopays&hl=en) application and more.
  
### Setup

- Make sure [Node](https://nodejs.org/) is installed

- Clone repo

- Run `npm install`

- Hope to god that better-sqlite compiles successfully on first try

- Add Telegram bot token to your environment vars as `TGBOT_TOKEN`, typically in your .bashrc (or .zshrc if you hang out with the cool kids) file, for example:

```

export TGBOT_TOKEN="MY_COOL_TOKEN"

```

If on Windows or want to configure the variable only for this project, add it to file .env in the repo root directory for [dotenv](https://github.com/motdotla/dotenv) to pick up like so:

```

TGBOT_TOKEN="MY_COOL_TOKEN"

```

### Usage

##### Bot

- Run `npm start` to start the bot