// Load up the discord.js library
const Discord = require('discord.js');
const request = require('request');
const fs = require('fs');

// Load the config.json file that contains:
// config.token contains the bot's token
// config.prefixes contains the message prefixes.
const config = require('./config.json');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL'] });

// Variables for testing, make `testMode` false to make requests to live servers
const testMode = config.testMode;
const testHost = '127.0.0.1';
const testPort = 9871;

var requestsSent = {
  messages: []
};

fs.readFile('requestsSent.json', 'utf8', function (err, data) {
  if (err) {
    console.log(err);
  } else {
    requestsSent = JSON.parse(data);
  }
});

client.on('ready', () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
});

client.on('message', async message => {
  if (message.author.bot && message.type === 'PINS_ADD') {
    message.delete();
    return;
  }
  // Ignore other bots
  if (message.author.bot) return;
  // Ignore any message that does not start with our prefix,
  // which is set in the configuration file.
  if (config.prefixes.some((prefix) => message.content.indexOf(prefix) !== 0)) return;

  console.log(message.cleanContent);
  // Here we separate our "command" name, and our "arguments"/"messageTexts".
  // e.g. if we have the message "!request Requesting X Feature Using @Ventuz Bot", we'll get the following:
  // fullCommand = !request
  // command = request
  // args = ["Requesting", "X", "Feature", "Using", "@Ventuz Bot"]
  // messageTextClean = Requesting X Feature Using @Ventuz Bot
  const args = message.cleanContent.trim().split(/\s+/g);
  const fullCommand = args.shift();
  const command = fullCommand.toLowerCase().replace(/^[<!+:]+|[!+:]+$|:[0-9]+>$/g, '');
  const messageTextClean = message.cleanContent.replace(new RegExp('^' + fullCommand, 'g'), '').trim();

  // Get the channel name and channel category of the message
  const channel = message.channel.name.toLowerCase();
  const category = message.channel.parent.name.toLowerCase();
  const user = message.author.username;

  console.log(`Command received from #${category} by ${user}.\r\nCommand: ${command}\r\nMessage: ${messageTextClean}`);

  // Verify the request is being made from the wishlist category
  if (category === 'ventuz wishlist/requests' || testMode) {
    // Ensure a valid command is being used
    if (command === 'request' || command === 'bug' || command === 'idea' || command === 'feedback') {
      makeRequest(message, command, messageTextClean, user, channel, 'Ventuz X');
    }
  }
});

// If someone forgot to add the :request: or :feedback: emoji, a reaction can be added to the message to trigger this bot.
client.on('messageReactionAdd', (reaction, userReacting) => {
  var message = reaction.message;
  // Ignore other bots
  if (message.author.bot) return;

  // If message contains prefix, ignore reaction since it's probably already been submitted.
  if (config.prefixes.some((prefix) => message.content.indexOf(prefix) === 0)) return;

  // Get the channel name and channel category of the message
  const channel = message.channel.name.toLowerCase();
  const category = message.channel.parent.name.toLowerCase();

  if (category === 'ventuz wishlist/requests' || testMode) {
    if (reaction.emoji.name === 'bug' || reaction.emoji.name === 'idea' || reaction.emoji.name === 'request' || reaction.emoji.name === 'feedback') {
      if (!requestsSent.messages.some((id) => message.id === id)) {
        makeRequest(message, reaction.emoji.name, message.cleanContent.trim(), message.author, channel, 'Ventuz X');
      }
    }
  }
});

// Enables 'messageReactionAdd to be fired for uncached messages
client.on('raw', packet => {
  // We don't want this to run on unrelated packets
  if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
  // Grab the channel to check the message from
  const channel = client.channels.get(packet.d.channel_id);
  // There's no need to emit if the message is cached, because the event will fire anyway for that
  if (channel.messages.has(packet.d.message_id)) return;
  // Since we have confirmed the message is not cached, let's fetch it
  channel.fetchMessage(packet.d.message_id).then(message => {
    // Emojis can have identifiers of name:id format, so we have to account for that case as well
    const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
    // This gives us the reaction we need to emit the event properly, in top of the message object
    const reaction = message.reactions.get(emoji);
    // Adds the currently reacting user to the reaction's users collection.
    if (reaction) reaction.users.set(packet.d.user_id, client.users.get(packet.d.user_id));
    // Check which type of event it is before emitting
    if (packet.t === 'MESSAGE_REACTION_ADD') {
      client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
    }
    if (packet.t === 'MESSAGE_REACTION_REMOVE') {
      client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
    }
  });
});

// Makes the request to the internal Ventuz system (or the test server)
function makeRequest (discordMessage, type, message, user, channel, version) {
  const host = testMode ? `http://${testHost}:${testPort}` : 'https://www.ventuz.com';
  const typeAbbr = type === 'bug' ? 'B' : 'F';
  const body = `<UserFeedback email="${user.tag}@discord" version="${version}" type="${typeAbbr}">\r\n` +
               `CATEGORY: ${channel.encodeHTML()}\r\n` +
               `${message.encodeHTML()}\r\n` +
               `</UserFeedback>`;

  const postRequest = {
    url: host + '/support/ventuzfeedback.php',
    body: body,
    headers: {
      'ver': version,
      'subject': `${type.toUpperCase()} in ${version} (from Discord)`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  request.post(postRequest,
    function (error, response, body) {
      console.log(response + ' - ' + body);
      if (!error && response.statusCode === 200) {
        // Log messages already replied to to prevent duplicates
        requestsSent.messages.push(discordMessage.id);
        var json = JSON.stringify(requestsSent);
        fs.writeFile('requestsSent.json', json, 'utf8', function (err) {
          if (err) {
            console.log('Error saving log.');
          } else {
            console.log('Request log saved.');
          }
        });

        discordMessage.reply(`thanks! Your ${type.toUpperCase()} was logged to Ventuz's internal system. \n*This bot is activated when starting a message with <:request:438094331551940611>, <:idea:438099104376160267> or "!" in any wishlist/request channel (or by adding <:request:438094331551940611>/<:idea:438099104376160267> as a reaction)*`);
        discordMessage.pin();
      }
    }
  );
}

if (!String.prototype.encodeHTML) {
  String.prototype.encodeHTML = function () {
    return this.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
}

// Create a test server if it test mode for receiving the <UserFeedback> message
if (testMode) {
  const http = require('http');
  const server = http.createServer(function (req, res) {
    console.dir(req.param);

    if (req.method === 'POST') {
      console.log('POST');
      var body = '';
      req.on('data', function (data) {
        body += data;
      });
      req.on('end', function () {
        console.log('Body: ' + body);
      });
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('post received');
    }
  });
  server.listen(testPort);
  console.log('Server Started On Port ' + testPort);
}

client.login(config.token);
