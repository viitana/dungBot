# pooBot
A Telegram bot that tracks your employer's losses due to you pooping on company time. Brilliant.

### Setup
- Make sure [Node](https://nodejs.org/) is installed
- Clone repo
- Run `npm install`
- Hope to god that better-sqlite compiles successfully on first try
- Add Telegram bot token to your exports as `TGBOT_TOKEN` in your .bashrc (or .zshrc if you hang out with the cool kids) file, for example:
	```
	export TGBOT_TOKEN="MY_COOL_TOKEN"
	```
	If on Windows or want to configure the variable only for this project, add it to file .env in the repo root directory for [dotenv](https://github.com/motdotla/dotenv) to pick up like so:
	```
	TGBOT_TOKEN="MY_COOL_TOKEN"
	```
	*If intending to run on the official bot account, ask Atte for token.*
	
- If setting up the deployment server via Gitlab webhook, also add variable `TGBOT_DEPLOY_TOKEN`.

### Usage
##### Bot
- Run `npm run dev` to start the bot in development mode
##### Webhook autodeploy
- Make sure a valid token is exported as env variable `TGBOT_DEPLOY_TOKEN` **and** set up in webhook
- Run `pm2 start deploy/deployServer.js --name deploy && pm2 start index.js --name bot` to start the webhook listener and bot

The bot will now pull the latest changes and reboot when any merge request completes (merges).

Note that changes to `deployServer.js` will not take place as it doesn't get rebooted. To apply changes to the server, reboot it with for example `pm2 delete deploy && pm2 start deploy/deployServer.js --name deploy`