import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('Database ID:', firebaseConfig.firestoreDatabaseId);
  
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    
    const dbNamed = getFirestore(firebaseConfig.firestoreDatabaseId);
    const dbDefault = getFirestore();
    
    async function check() {
      try {
        console.log(`Attempting to write to NAMED database: ${firebaseConfig.firestoreDatabaseId}...`);
        await dbNamed.collection('test_connection').doc('ping').set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
        console.log('Successfully wrote to NAMED database!');
        const collectionsNamed = await dbNamed.listCollections();
        console.log('Named Database Collections:', collectionsNamed.map(c => c.id));
      } catch (e: any) {
        console.error('Error in NAMED database:', e.message);
        if (e.code === 7) {
          console.error('PERMISSION_DENIED: This usually means the service account doesn\'t have access to this database.');
        }
      }

      try {
        console.log('Attempting to list collections in DEFAULT database...');
        const collectionsDefault = await dbDefault.listCollections();
        console.log('Default Database Collections:', collectionsDefault.map(c => c.id));
      } catch (e: any) {
        console.error('Error listing collections in DEFAULT database:', e.message);
      }
      process.exit();
    }
    
    check();
  } catch (e: any) {
    console.error('Initialization error:', e.message);
    process.exit();
  }
} else {
  console.log('Config not found');
  process.exit();
}
