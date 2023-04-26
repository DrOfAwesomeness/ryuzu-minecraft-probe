import amqplib from 'amqplib';
import config from '../lib/config';
import { IProbeEvent } from '../src/eventSpec';

(async() => {
  const connection = await amqplib.connect(config.amqpUrl);
  const channel = await connection.createChannel();
  await channel.assertExchange(config.amqpEventExchange, 'topic', { durable: true });

  const queue = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue.queue, config.amqpEventExchange, 'server.#');

  channel.consume(queue.queue, async (message) => {
    if (!message) {
      return;
    }

    const event = JSON.parse(message.content.toString()) as IProbeEvent;
    switch (event.type) {
      case 'chat':
        console.log(`[${event.serverId}] ${event.timestamp} <${event.username}> ${event.message}`);
        break;
      case 'join':
        console.log(`[${event.serverId}] ${event.timestamp} ${event.username} joined from ${event.ipAddress}`);
        break;
    }

    await channel.ack(message);
  });
})();