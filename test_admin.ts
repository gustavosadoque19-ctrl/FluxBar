import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

async function test() {
  try {
    initializeApp();
    console.log("Admin SDK initialized with default credentials.");
    
    const db = getFirestore();
    console.log(`Using default database.`);
    
    const collections = await db.listCollections();
    console.log(`Collections in default database: ${collections.map(c => c.id).join(', ')}`);
    
    await db.collection('test').doc('connection').set({ timestamp: FieldValue.serverTimestamp() });
    console.log("Successfully wrote to default database.");
  } catch (error: any) {
    console.error(`Error in default database: ${error.message}`);
  }
}

test();
