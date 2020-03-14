'use strict';

const { find: findChannel } = require('../db/channels');
const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');

const token = process.env.SLACK_BOT_TOKEN || '';

const web = new WebClient(token);
const rtm = new RTMClient(token);

let botId;

function getBotId() {
  return botId;
}

rtm.on('authenticated', (rtmStartData) => {
  botId = rtmStartData.self.id;
});

rtm.start();

const slack = {
  rtm,
  web,
  getBotId
};

module.exports = slack;
