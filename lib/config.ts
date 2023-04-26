import dotenv from 'dotenv';
dotenv.config();

export interface IConfig {
  logFilePath: string;
  amqpUrl: string;
  amqpEventExchange: string;
  amqpCommandExchange: string;
  serverId: string;
  rconHost: string;
  rconPort: number;
  rconPassword: string;
  dbFilePath: string;
}

function getAssertedConfig(name: string): string {
  const data = process.env[name];
  if (!data) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return data;
}

function getAssertedConfigNumber(name: string): number {
  const data = getAssertedConfig(name);
  const num = parseInt(data, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${name} is not a number`);
  }
  return num;
}

const config: IConfig = {
  logFilePath: getAssertedConfig('MINECRAFT_SERVER_LOG_PATH'),
  amqpUrl: getAssertedConfig('AMQP_URL'),
  amqpEventExchange: getAssertedConfig('AMQP_EVENT_EXCHANGE'),
  amqpCommandExchange: getAssertedConfig('AMQP_COMMAND_EXCHANGE'),
  serverId: getAssertedConfig('SERVER_ID'),
  rconHost: getAssertedConfig('RCON_HOST'),
  rconPort: getAssertedConfigNumber('RCON_PORT'),
  rconPassword: getAssertedConfig('RCON_PASSWORD'),
  dbFilePath: process.env.DB_FILE_PATH || `${__dirname}/../app.db`
};

export default config;