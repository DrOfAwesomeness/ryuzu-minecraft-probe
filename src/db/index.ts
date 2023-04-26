import sqlite3 from 'sqlite3';
import config from '../../lib/config';
import AsyncDatabase from './async';

import version1 from './migrations/version1';
import CommandExecution from './models/CommandExecution';
import logger from '../../lib/logger';

let db: sqlite3.Database;
let asyncDb: AsyncDatabase;

const migrations = [
  version1
];

interface IDbError {
  errno: number;
  code: string;
  message: string;
}

function isDbError(obj: unknown) : obj is IDbError {
  return obj instanceof Error && 'errno' in obj && 'code' in obj && 'message' in obj;
}

export async function getCurentSchemaVersion() {
  try {
    const version = await asyncDb.get<{version: number}>('SELECT version FROM schema_version LIMIT 1');
    return version.version;
  } catch (e) {
    if (isDbError(e)) {
      if (e.code === 'SQLITE_ERROR' && e.errno === 1 && e.message.indexOf('no such table') !== -1) {
        return 0;
      }
    }
    throw e;
  }
}

export async function initializeDatabase() {
  db = new sqlite3.Database(config.dbFilePath);
  asyncDb = new AsyncDatabase(db);
  const dbVersion = await getCurentSchemaVersion();
  const pendingMigrations = migrations.filter(x => x.versionNumber > dbVersion);
  for (const migration of pendingMigrations) {
    logger.info(`Migrating to version ${migration.versionNumber}`);
    await migration.migrate(asyncDb);
  }
}

export async function getCommandExecutionById(id: number) {
  return await asyncDb.get<CommandExecution>('SELECT * FROM command_execution WHERE id = ?', [id]);
}

export async function getIncompleteCommandexecutionsByTrigger(trigger: string) {
  const result = await asyncDb.get<CommandExecution[] | CommandExecution>('SELECT * FROM command_execution WHERE triggerKey = ? AND completedAt IS NULL', [trigger]);
  if (!result) {
    return [];
  }
  if (Array.isArray(result)) {
    return result;
  } else {
    return [result];
  }
}

export async function insertCommandExecution(commandExecution: CommandExecution) {
  const sql = `
    INSERT INTO command_execution (commandName, command, serverId, triggerKey, state)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [
    commandExecution.commandName,
    commandExecution.command,
    commandExecution.serverId,
    commandExecution.triggerKey,
    commandExecution.state
  ];
  const result = await asyncDb.run(sql, params);
  commandExecution.id = result.lastID;
  return commandExecution;
}

export async function updateCommandExecution(commandExecution: CommandExecution) {
  const sql = `
    UPDATE command_execution
    SET commandName = ?, command = ?, serverId = ?, triggerKey = ?, state = ?, completedAt = ?
    WHERE id = ?
  `;
  const params = [
    commandExecution.commandName,
    commandExecution.command,
    commandExecution.serverId,
    commandExecution.triggerKey,
    commandExecution.state,
    commandExecution.completedAt,
    commandExecution.id
  ];
  await asyncDb.run(sql, params);
  return commandExecution;
}