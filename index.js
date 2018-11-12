// Load up the discord.js library
const Discord = require('discord.js');
const request = require('request');

// Load the config.json file that contains:
// config.token contains the bot's token
// config.prefixes contains the message prefixes.
const config = require('./config.json');
const client = new Discord.Client();

// Variables for testing, make `testMode` false to make requests to live servers
const testMode = config.testMode;
const testHost = '127.0.0.1';
const testPort = 9871;

client.on('ready', () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
});

client.on('message', async message => {
  // Ignore other bots
  if (message.author.bot) return;
  // Ignore any message that does not start with our prefix,
  // which is set in the configuration file.
  if (config.prefixes.some(function (prefix) { message.content.indexOf(prefix) !== 0; })) return;

  console.log(message.cleanContent);
  // Here we separate our "command" name, and our "arguments"/"messageTexts".
  // e.g. if we have the message "!request Requesting X Feature Using @Ventuz Bot", we'll get the following:
  // fullCommand = !request
  // command = request
  // args = ["Requesting", "X", "Feature", "Using", "@Ventuz Bot"]
  // messageTextClean = Requesting X Feature Using @Ventuz Bot
  const args = message.cleanContent.trim().split(/ +/g);
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

function makeRequest (discordMessage, type, message, user, channel, version) {
  const host = testMode ? `http://${testHost}:${testPort}` : 'https://www.ventuz.com';
  const typeAbbr = type === 'bug' ? 'B' : 'F';
  const body = `<UserFeedback email="${user}@discord" version="${version}" type="${typeAbbr}">\r\n` +
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
        discordMessage.reply(`thanks! Your ${type.toUpperCase()} was logged to Ventuz's internal system.`);
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
