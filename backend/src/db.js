import { MongoClient } from 'mongodb';
import { config } from './config.js';

let client;
let db;

export async function connectDb() {
  if (db) return db;

  client = new MongoClient(config.mongoUri, {
    appName: config.mongoAppName,
    maxPoolSize: 20,
  });

  await client.connect();
  db = client.db(config.dbName);

  console.log(`MongoDB Atlas connected — database: ${config.dbName}`);
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not connected. Call connectDb() first.');
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}
