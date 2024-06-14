const { Client, GatewayIntentBits } = require('discord.js');
const { StreamType } = require('@discordjs/voice');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus } = require('@discordjs/voice');
const { exec } = require('child_process');

const record = require('node-record-lpcm16');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildVoiceStates, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent]
});

const Transform = require('stream').Transform;

const { Readable } = require('stream');

class BufferingTransform extends Transform {
  constructor(options) {
    super(options);
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    console.log(`Buffer size: ${this.buffer.length}`);
    while (this.buffer.length >= 960) {
      const chunkToSend = this.buffer.slice(0, 960);
      this.buffer = this.buffer.slice(960);
      this.push(chunkToSend);
      console.log(`Sent chunk of size ${chunkToSend.length}`);
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer.length >= 960) {
      this.push(this.buffer);
    }
    this.buffer = Buffer.alloc(0);
    callback();
  }
}

function startMicrophoneStreaming() {
  voiceConnection.subscribe(audioPlayer);
  const spawn = require('child_process').spawn;
  const micStream = spawn('parec', ['--format=s16le', '-d', 'virtual1.monitor']);
  const ffmpeg = spawn('ffmpeg', ['-f', 's16le', '-ar', '44100', '-ac', '2', '-i', 'pipe:0', '-f', 'opus', 'pipe:1'], { stdio: ['pipe', 'pipe', 'ignore'] });
  micStream.stdout.pipe(ffmpeg.stdin);
  ffmpeg.stdout.pipe(bufferingTransform);

  const audioStream = new Readable({
    read() {
      // The _read method is required but can be a no-op
    }
  });

  bufferingTransform.on('data', (chunk) => {
    audioStream.push(chunk);
    console.log(`Received chunk of size ${chunk.length}`);
  });

  const audioResource = createAudioResource(audioStream, {
    inputType: StreamType.OggOpus,
    inlineVolume: true // Optional: Enable if you want to control volume
  });

  audioPlayer.play(audioResource);
}

let voiceConnection; // To store the voice connection
const audioPlayer = createAudioPlayer();
const bufferingTransform = new BufferingTransform();

client.once('ready', () => {
  console.log('Bot is ready.');
});

client.on('messageCreate', async message => {
  if (message.content === '!join') {
    if (message.member.voice.channel) {
      voiceConnection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });
      startMicrophoneStreaming();
    } else {
      message.reply('You need to join a voice channel first!');
    }
  } else if (message.content === '!leave') {
      if (voiceConnection) {
        voiceConnection.destroy();
      } else {
        message.reply('I am not in a voice channel!');
      }
  }
});

client.login('MTI1MDk0Mzg4Mzc5NDE4NjI4MA.GQiElJ.DXHitDpI9FAmm-U7NKuVdQk0jJ8jKrvd7qzRIM');
