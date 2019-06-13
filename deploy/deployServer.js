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

// Setup listening
app.post('/', (req, res) => {

  // Check if verification token is correct
  const reqToken = req.headers['x-gitlab-token'];
  if (reqToken !== token) {
    return res.sendStatus(401);
  }

  // Pull and reboot on successful merge requests
  if (req &&
    req.body &&
    req.body.object_attributes &&
    req.body.object_attributes.action &&
    req.body.object_attributes.action === "merge") {
      shell.exec('pm2 stop bot')
      shell.exec('git fetch --all');
      shell.exec('git checkout --force')
      shell.exec('pm2 start index.js --name bot')
  }
  res.sendStatus(200);
});

app.listen(2277, () => console.log('Webhook is listening'));