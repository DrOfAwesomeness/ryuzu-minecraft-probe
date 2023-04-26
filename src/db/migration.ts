import sqlite3 from 'sqlite3';
import AsyncDatabase from './async';

export interface IMigration {
  versionNumber: number;
  migrate: (db: AsyncDatabase) => Promise<void>;
}