import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

let _app: FirebaseApp | null = null;
let _database: Database | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    const firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC6-gM-RIGcdTYuzBt90l6IBVqugbztUYc',
      databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://whato-90577-default-rtdb.firebaseio.com',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'whato-90577',
    };
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return _app;
}

export function getDb(): Database {
  if (!_database) {
    _database = getDatabase(getFirebaseApp());
  }
  return _database;
}
