import admin from "firebase-admin";

try {
  admin.initializeApp();
  const app = admin.app();
  console.log('Default Project ID:', app.options.projectId);
} catch (e: any) {
  console.error('Error:', e.message);
}
process.exit();
