#!/usr/bin/env node
/**
 * Firestore Backup Script
 * 
 * Creates JSON backups of critical collections before schema migration
 * Run: node src/backend/scripts/backup-firestore.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Backup directory
const BACKUP_DIR = path.resolve(__dirname, '../../../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `firestore-backup-${timestamp}`);

// Collections to backup
const COLLECTIONS = ['users', 'orders', 'orders_v2', 'webhook_events'];

async function backupCollection(collectionName) {
  console.log(`📦 Backing up collection: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const documents = [];

    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    const collectionBackupPath = path.join(backupPath, `${collectionName}.json`);
    fs.writeFileSync(
      collectionBackupPath,
      JSON.stringify(documents, null, 2),
      'utf8'
    );

    console.log(`   ✅ Backed up ${documents.length} documents from ${collectionName}`);
    return documents.length;
  } catch (error) {
    console.error(`   ❌ Error backing up ${collectionName}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🔄 Starting Firestore backup...\n');

  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }

  let totalDocs = 0;

  // Backup each collection
  for (const collection of COLLECTIONS) {
    const count = await backupCollection(collection);
    totalDocs += count;
  }

  // Create backup metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    collections: COLLECTIONS,
    totalDocuments: totalDocs,
    backupPath,
  };

  fs.writeFileSync(
    path.join(backupPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );

  console.log('\n✅ Backup completed successfully!');
  console.log(`📁 Backup location: ${backupPath}`);
  console.log(`📊 Total documents: ${totalDocs}`);
  console.log('\n💡 To restore from this backup, run:');
  console.log(`   node src/backend/scripts/restore-firestore.js ${path.basename(backupPath)}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Backup failed:', error);
  process.exit(1);
});
