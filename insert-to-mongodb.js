const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bank_statements';
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'bank_statements';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'email_data';

async function insertJsonFiles() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${DATABASE_NAME}`);
    console.log(`📁 Collection: ${COLLECTION_NAME}`);
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Check if data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      console.log('❌ Data directory not found. Please fetch some emails first.');
      return;
    }
    
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('❌ No JSON files found in data directory. Please fetch some emails first.');
      return;
    }
    
    console.log(`📂 Found ${files.length} JSON files to process`);
    
    let totalEmails = 0;
    let insertedEmails = 0;
    
    for (const file of files) {
      console.log(`\n📄 Processing file: ${file}`);
      const filepath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filepath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (!data.emails || !Array.isArray(data.emails)) {
        console.log(`⚠️  Skipping ${file}: No emails array found`);
        continue;
      }
      
      totalEmails += data.emails.length;
      console.log(`📧 Found ${data.emails.length} emails in ${file}`);
      
      // Insert each email as a separate document
      for (const email of data.emails) {
        try {
          const document = {
            ...email,
            source_file: file,
            metadata: data.metadata,
            inserted_at: new Date().toISOString()
          };
          
          // Check if email already exists (based on email_id and source_file)
          const existing = await collection.findOne({
            email_id: email.email_id,
            source_file: file
          });
          
          if (existing) {
            console.log(`⏭️  Skipping duplicate email ${email.email_id} from ${file}`);
            continue;
          }
          
          await collection.insertOne(document);
          insertedEmails++;
          console.log(`✅ Inserted email ${email.email_id} from ${file}`);
          
        } catch (error) {
          console.error(`❌ Error inserting email ${email.email_id} from ${file}:`, error.message);
        }
      }
    }
    
    console.log(`\n🎉 Processing complete!`);
    console.log(`📊 Total emails found: ${totalEmails}`);
    console.log(`✅ Emails inserted: ${insertedEmails}`);
    console.log(`⏭️  Duplicates skipped: ${totalEmails - insertedEmails}`);
    
    // Show collection stats
    const stats = await collection.stats();
    console.log(`\n📈 Collection statistics:`);
    console.log(`   Documents: ${stats.count}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Indexes: ${stats.nindexes}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('💡 Make sure MongoDB is running and connection string is correct');
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the insertion
console.log('🚀 Starting MongoDB insertion process...\n');
insertJsonFiles(); 