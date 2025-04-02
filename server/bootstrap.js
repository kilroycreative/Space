const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const FILES_TO_CREATE = [
  'entries.json',
  'echoes.json',
  'ghost-threads.json'
];

async function bootstrap() {
  try {
    // Create data directory if it doesn't exist
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log('✓ Data directory created');
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      console.log('✓ Data directory exists');
    }

    // Initialize empty files if they don't exist
    for (const file of FILES_TO_CREATE) {
      const filePath = path.join(DATA_DIR, file);
      try {
        await fs.access(filePath);
        console.log(`✓ ${file} exists`);
      } catch (err) {
        await fs.writeFile(filePath, '[]');
        console.log(`✓ Created ${file}`);
      }
    }

    console.log('\n✨ Bootstrap complete. The void awaits.');
  } catch (error) {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  }
}

// Run bootstrap if called directly
if (require.main === module) {
  bootstrap();
}

module.exports = bootstrap; 