import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

async function testClient() {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    console.log("Project ID:", firebaseConfig.projectId);
    console.log("Database ID:", firebaseConfig.firestoreDatabaseId);

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    // We can't easily sign in with a script without a password
    // but we can try to read a public collection if rules allow.
    console.log("Attempting to read 'settings/general'...");
    const settings = await getDocs(collection(db, 'settings'));
    console.log("Read successful, count:", settings.size);

  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

testClient();
