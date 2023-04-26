import { IMigration } from '../migration';

const version1: IMigration = {
  versionNumber: 1,
  migrate: async (db) => {
    await db.run(`CREATE TABLE schema_version (version INTEGER PRIMARY KEY)`);
    await db.run(`INSERT INTO schema_version (version) VALUES (1)`);

    await db.run(`CREATE TABLE command_execution (id INTEGER PRIMARY KEY AUTOINCREMENT, commandName VARCHAR(20) NOT NULL, command TEXT NOT NULL, serverId VARCHAR(20) NOT NULL, completedAt DATETIME, triggerKey VARCHAR(255), state TEXT)`);
  }
}

export default version1;