import amqplib from 'amqplib';
import TailFile from '@logdna/tail-file';
import { Rcon } from 'rcon-client';

import config from '../lib/config';
import { initializeDatabase } from './db';
import { processMinecraftLogLine } from './logProcessor';
import { ICommand } from './commandSpec';
import { processCommand, processTrigger } from './commandProcessor';
import logger from '../lib/logger';

(async() => {
  await initializeDatabase();
  
  const connection = await amqplib.connect(config.amqpUrl);
  const eventChannel = await connection.createChannel();
  await eventChannel.assertExchange(config.amqpEventExchange, 'topic', { durable: true });
  const commandChannel = await connection.createChannel();
  commandChannel.assertExchange(config.amqpCommandExchange, 'direct', { durable: true });
  const commandQueue = await commandChannel.assertQueue('', { exclusive: true });
  await commandChannel.bindQueue(commandQueue.queue, config.amqpCommandExchange, `server.${config.serverId}`);

  const rcon = new Rcon({
    host: config.rconHost,
    port: config.rconPort,
    password: config.rconPassword
  });

  logger.info('Connecting to RCON');
  await rcon.connect();
  
  const tail = new TailFile(config.logFilePath, {
    encoding: 'utf8'
  });
  
  let buffer = '';
  
  tail.on('data', (chunk: string) => {
    buffer += chunk;
    let newLineIndex = buffer.indexOf('\n');
    while (newLineIndex !== -1) {
      const line = buffer.substring(0, newLineIndex);
      buffer = buffer.substring(newLineIndex + 1);
      newLineIndex = buffer.indexOf('\n');
      const firedTriggers = processMinecraftLogLine(line, eventChannel);
      firedTriggers.then(async (triggers) => {
        if (triggers) {
          for (const trigger of triggers) {
            await processTrigger(trigger, rcon);
          }
        }
      });
    }
  });

  commandChannel.consume(commandQueue.queue, async (message) => {
    if (!message) {
      return;
    }
    try {
      const command = JSON.parse(message.content.toString()) as ICommand;
      processCommand(command, rcon);
      await commandChannel.ack(message);
    } catch (e) {
      console.error(`Failed processing command`, e);
      await commandChannel.nack(message);
    }
  });

  tail.start();
  logger.info('Probe up and running');
})();