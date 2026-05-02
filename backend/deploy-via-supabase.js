#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploySQLviaPostgreSQL() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      Deploying RPC Functions via PostgreSQL Client         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Parse Supabase URL to get connection string
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    }

    // Extract database credentials from Supabase
    // URL format: https://[project-id].supabase.co
    const projectId = supabaseUrl.replace('https://', '').split('.')[0];
    
    // Build connection string for psql
    // postgres://postgres:[password]@db.[project-id].supabase.co:5432/postgres
    const dbHost = `db.${projectId}.supabase.co`;
    const dbPort = 5432;
    const dbName = 'postgres';
    const dbUser = 'postgres';

    console.log('📝 To deploy, you need your Supabase database password.');
    console.log('   Find it at: https://app.supabase.com → Project Settings → Database\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'SEARCH_AUTH_USERS_FUNCTIONS.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Write to temp file
    const tempFile = path.join(__dirname, '.temp-deploy.sql');
    fs.writeFileSync(tempFile, sqlContent);

    console.log('✅ SQL file prepared\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          Manual Deployment Instructions                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Option A: Using Supabase Dashboard (Easiest)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Go to: https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Click: SQL Editor → New Query');
    console.log('4. Copy contents of: backend/SEARCH_AUTH_USERS_FUNCTIONS.sql');
    console.log('5. Paste into editor and click: Run\n');

    console.log('Option B: Using psql Command Line');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Requires: psql installed on your system\n');
    console.log('Connection string:');
    console.log(`  postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}\n`);
    
    console.log('Run command:');
    console.log(`  psql "postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}" < backend/SEARCH_AUTH_USERS_FUNCTIONS.sql\n`);
    console.log('When prompted, enter your database password from Supabase Dashboard\n');

    console.log('Option C: Automatic (if database password is available)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Set DATABASE_PASSWORD in .env and run: node deploy-via-psql.js\n');

    // Clean up
    fs.unlinkSync(tempFile);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Note: Frontend works without RPC functions deployed     ║');
    console.log('║     Direct table queries will be used as fallback          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deploySQLviaPostgreSQL();
