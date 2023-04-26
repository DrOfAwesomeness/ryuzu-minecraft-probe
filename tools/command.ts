import amqplib from 'amqplib';
import config from '../lib/config';
import { IRewardCommand } from '../src/commandSpec';

if (process.argv.length < 4) {
  console.error('Usage: command <server> <command>');
  process.exit(1);
}

const serverId = process.argv[2];
const command = process.argv[3];

(async () => {
  const connection = await amqplib.connect(config.amqpUrl);
  const channel = await connection.createChannel();
  await channel.assertExchange(config.amqpCommandExchange, 'direct', { durable: true });
  const routingKey = `server.${serverId}`;
  switch (command) {
    case 'reward':
      if (process.argv.length < 7) {
        console.error('Usage: reward <username> <quantity> <itemSpec> [message]');
        process.exit(1);
      }

      const username = process.argv[4];
      const quantity = parseInt(process.argv[5], 10);
      const itemSpec = process.argv[6];
      const commandObj: IRewardCommand = {
        type: 'reward',
        username,
        items: [
          {
            itemSpec,
            quantity
          },
          {
            itemSpec: 'minecraft:iron_ingo',
            quantity: 1
          }
        ]
      }

      if (process.argv[7]) {
        commandObj.message = JSON.stringify({text: process.argv[7], bold: true, color: 'dark_purple'});
      }

      await channel.publish(config.amqpCommandExchange, routingKey, Buffer.from(JSON.stringify(commandObj)));
      break;
  }
  await channel.close();
  await connection.close();
})();