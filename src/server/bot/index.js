'use strict';

const deepFreeze = require('deep-freeze');
const bots = require('../db/bots');
const channels = require('../db/channels');
const wrappedEval = require('../utils/eval');
const { rtm, web, getBotId } = require('../slack');

// bot modules
const modules = require('./modules');

rtm.on('message', async(res) => {

  if (res.type !== 'message') return;

  const botId = getBotId();

  // reply
  if (res.text.includes(botId)) {
    const text = res.text.split(/<.+?>/g)[1].trim();

    switch (text) {
      case 'alive?':
        return rtm.sendMessage(':ok_woman:', res.channel);
      case 'site':
        return rtm.sendMessage(`👉 ${process.env.SITE_URI}`, res.channel);
      case 'help':
        return rtm.sendMessage(`👉 ${process.env.SITE_URI}`, res.channel);
      case 'list': {
        const list = await bots.findAll({ channel_id: res.channel });
        const attachments = list.map((bot) => {
          const data = bot.dataValues;

          return {
            color     : data.latest_error ? 'danger' : 'good',
            title     : data.name,
            title_link: `${process.env.SITE_URI}/#/bots/${data.id}`,
            fields  : [
              {
                title: 'Keyword',
                value: data.identification_word,
                short: true
              },
              {
                title: 'Description',
                value: data.description,
                short: false
              }
            ]
          };
        });

        return web.chat.postMessage({
          channel: res.channel,
          text: `🤖 ${list.length} active bots in this channel`,
          attachments
        });
      }
    }
  }

  // validate a bot and run script
  else if (res.user !== botId && res.text !== undefined && res.subtype !== 'bot_message') {
    let id, icon, username, script, storage;

    try {

      // channe_id(from slack) -> search channel_name(from channels)
      const { channel } = await web.channels.info({channel: res.channel});
      const { dataValues: channelValue } = await channels.find({ name: channel.name });

      // TODO: join channels and bots

      if (!channelValue) throw new Error('not found');

      const botsList = await bots.findAll({
        channel_id: channelValue.channel_id
      });

      if (botsList.length === 0) return;

      const bot = botsList.find((b) => {
        const re = new RegExp(`^${b.dataValues.identification_word}$`);

        return !!res.text.match(re);
      });

      if (!bot) return;

      id = bot.dataValues.id;
      icon = bot.dataValues.icon;
      script = bot.dataValues.script;
      username = bot.dataValues.name;
      storage = bot.dataValues.storage;
    } catch (e) {
      console.error(e);
      return;
    }

    let message;

    try {
      const api = {
        slack: {
          message    : res.text,
          postMessage: (message) => {
            rtm._chat.postMessage(res.channel, message, {
              username,
              ...icon.includes('http') ?
                { icon_url: icon } :
                { icon_emoji: icon }
            });
          }
        },
        modules: deepFreeze(modules),
        storage
      };

      const bannedWord = script.match(/process|require|global/g);

      if (bannedWord) throw new Error(`contains the banned word: ${bannedWord}`);

      script = script.replace(/process/, '').replace(/require/, '');

      message = await wrappedEval(script, api);

      if (api.storage == undefined) {
        api.storage = {};
      }

      // validate
      if (Object.prototype.toString.call(api.storage) !== '[object Object]') {
        throw new Error('storage type is not JSON');
      }

      await bots.update(id, { storage: api.storage });

      // TODO: add validation
      // attachments
      // if (!(Object.prototype.toString.call(message) !== '[object Object]' && message.text)) {
      // }
      // if (typeof message === 'object') throw new Error('required Primitive Type');
    } catch (e) {
      console.log(e);
      bots.update(id, { latest_error: e.toString() });

      return web.chat.postMessage({
        channel: res.channel, text: 'an error occurred',
        attachments: [{
          author_name: username,
          text       : `😵 ${e.toString()}: <${process.env.SITE_URI}/#/bots/${id}|URL>`,
          color      : 'danger'
        }]
      });
    }

    try {
      if (Object.prototype.toString.call(message) === '[object Object]' && message.text) {
        return web.chat.postMessage({
          channel: res.channel,
          text: message.text,
          attachments: message.attachments,
          username,
          ...icon.includes('http') ?
            { icon_url: icon } :
            { icon_emoji: icon }
        });
      }

      web.chat.postMessage(
        {
          channel: res.channel,
          text: message,
          username,
          ...icon.includes('http') ?
            { icon_url: icon } :
            { icon_emoji: icon }
      });

      bots.update(id, { latest_error: null });
    } catch (e) {
      console.error(e);
    }
  }
});
