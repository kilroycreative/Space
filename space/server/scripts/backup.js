const fs = require('fs').promises;
const path = require('path');

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sourceDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
  const backupDir = path.join(__dirname, '../../backups', timestamp);

  try {
    await fs.mkdir(backupDir, { recursive: true });
    const files = await fs.readdir(sourceDir);

    for (const file of files) {
      const data = await fs.readFile(path.join(sourceDir, file), 'utf8');
      await fs.writeFile(path.join(backupDir, file), data);
    }

    console.log(`✓ Backup complete: ${backupDir}`);
  } catch (err) {
    console.error('Backup failed:', err);
  }
}

backup(); 