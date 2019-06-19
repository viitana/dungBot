const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json({ limit: '10mb', extended: true })); // creates http server
const shell = require('shelljs');

// Check Git installation
if (!shell.which('git')) {
  shell.echo('Server requires Git. Exiting.');
  shell.exit(1);
}

// Check token export
require('dotenv').config()
const token = process.env.TGBOT_DEPLOY_TOKEN;
if (!token) {
  console.error('*** DEPLOY TOKEN NOT FOUND ***\n* If trying to run officially, ask Atte for token\n* Otherwise export your own and add to webhook\nExiting');
  process.exit();
}

const reset = () => {
  shell.exec('pm2 stop bot')
  shell.exec('git checkout master')
  shell.exec('git reset --hard HEAD');
  shell.exec('git pull origin master')
  shell.exec('pm2 start index.js --name bot')
}

// Setup listening
app.post('/', (req, res) => {

  // Check if verification token is correct
  const reqToken = req.headers['x-gitlab-token'];
  if (reqToken !== token) {
    return res.status(200).send('OK, bot rebooting!')
  }

  // Pull and reboot on successful merge requests
  if (req.body.object_attributes.action === "merge") {
      console.log("GIT HOOK: New merge detected, rebooting")
      res.status(200).send('OK, rebooting bot!')
      await reset()
  }

  // The same for Gitlab merge event tests
  if (req.body.object_attributes.description === "Test merge") {
      console.log("GIT HOOK: New test merge detected, rebooting")
      res.status(200).send('OK, rebooting bot!')
      await reset()
  }
  
  res.sendStatus(500);
});

app.listen(2277, () => console.log('Webhook is listening'));