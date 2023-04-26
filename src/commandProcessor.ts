import { Rcon } from 'rcon-client';

import config from '../lib/config';
import { ICommand, IRewardCommand } from './commandSpec';
import CommandExecution from './db/models/CommandExecution';
import { getIncompleteCommandexecutionsByTrigger, insertCommandExecution, updateCommandExecution } from './db';
import logger from '../lib/logger';

type CommandResult = { succeeded: boolean, state?: string };

async function processRewardCommand(command: IRewardCommand, rcon: Rcon, state?: string): Promise<CommandResult> {
  const parsedState = state ? JSON.parse(state) as { remainingItems: IRewardCommand['items'], error: string } : undefined;
  const remainingItems = parsedState ? parsedState.remainingItems : command.items;
  let error: string = '';
  while (remainingItems.length > 0) {
    const next = remainingItems.shift();
    if (!next) break;
    try {
      const result = await rcon.send(`give ${command.username} ${next.itemSpec} ${next.quantity}`);
      if (!(/^Gave/.test(result))) {
        remainingItems.splice(0, 0, next);
        error = result;
        break;
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      logger.warn('Encountered error processing reward command', {err: e});
      remainingItems.splice(0, 0, next);
      error = errorMsg;
      break;
    }
  }

  if (remainingItems.length === 0) {
    if (command.message) {
      await rcon.send(`tellraw ${command.username} ${command.message}`);
    }
  }

  return {
    succeeded: remainingItems.length === 0,
    state: JSON.stringify({
      remainingItems,
      error,
    }),
  }
}

async function triggerCommand(dbCommand: CommandExecution, rcon: Rcon) {
  let result: CommandResult;
  switch (dbCommand.commandName) {
    case 'reward':
      const command = JSON.parse(dbCommand.command) as IRewardCommand;
      result = await processRewardCommand(command, rcon, dbCommand.state);
      break;
      default:
        throw Error('Unknown command type');
  }
  if (result.succeeded) {
    dbCommand.completedAt = new Date();
  }
  dbCommand.state = result.state;
  await updateCommandExecution(dbCommand);
}

export async function processTrigger(trigger: string, rcon: Rcon) {
  const incomplete = await getIncompleteCommandexecutionsByTrigger(trigger);

  for (const command of incomplete) {
    await triggerCommand(command, rcon);
  }
}

export async function processCommand(command: ICommand, rcon: Rcon) {
  let dbCommand: CommandExecution = {
    commandName: command.type,
    command: JSON.stringify(command),
    serverId: config.serverId,
  }
  switch (command.type) {
    case 'reward':
      dbCommand.triggerKey = `join:${command.username}`;
      dbCommand = await insertCommandExecution(dbCommand); 
      logger.debug(`Processing a reward command to give ${command.username} some ${command.items.map(x => x.itemSpec).join(', ')}`);
      await triggerCommand(dbCommand, rcon);
      break;
  }
}
