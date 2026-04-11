import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

async function checkDb() {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    
    const app = admin.apps.length ? admin.app() : admin.initializeApp();

    console.log("--- Testing Default Database ---");
    try {
      const dbDefault = getFirestore(app);
      const testDocDefault = await dbDefault.collection('settings').limit(1).get();
      console.log("Default Database Read: SUCCESS");
    } catch (e: any) {
      console.error("Default Database Read: FAILED -", e.message);
    }

    console.log("\n--- Testing Named Database ---");
    try {
      const dbNamed = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      const testDocNamed = await dbNamed.collection('settings').limit(1).get();
      console.log("Named Database Read: SUCCESS");
    } catch (e: any) {
      console.error("Named Database Read: FAILED -", e.message);
    }

  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

checkDb();
