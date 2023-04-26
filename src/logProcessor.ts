import amqplib from 'amqplib';
import config from '../lib/config';
import { IChatEvent, IJoinEvent } from './eventSpec';

const chatRegex = /\<(.*)\> (.*)$/;
const joinRegex = /: (.*)\[\/(.*)\:.*\] logged in with entity id ([0-9]*) at \([-0-9\.]*, [-0-9\.]*, [-0-9\.]*\)$/;

export async function processMinecraftLogLine(line: string, channel: amqplib.Channel) {
  const chatMatch = line.match(chatRegex);
  const joinMatch = chatMatch ? undefined : line.match(joinRegex);
  const routingKeyBase = `server.${config.serverId}`;
  const firedTriggers = [];

  if (chatMatch) {
    const username = chatMatch[1];
    const message = chatMatch[2];
    const event: IChatEvent = {
      type: 'chat',
      timestamp: new Date().toISOString(),
      username,
      message,
      serverId: config.serverId
    };
    
    channel.publish(config.amqpEventExchange, `${routingKeyBase}.chat`, Buffer.from(JSON.stringify(event)));
  } else if (joinMatch) {
    const username = joinMatch[1];
    const ipAddress = joinMatch[2];

    firedTriggers.push(`join:${username}`);

    const event: IJoinEvent = {
      type: 'join',
      timestamp: new Date().toISOString(),
      username,
      ipAddress,
      serverId: config.serverId
    };
    
    channel.publish(config.amqpEventExchange, `${routingKeyBase}.join`, Buffer.from(JSON.stringify(event)));
    return firedTriggers;
  }
}