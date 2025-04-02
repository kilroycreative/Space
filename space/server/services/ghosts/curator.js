const { searchArchive, getRandomEntry } = require('../../utils/archive');
const { getEmbedding } = require('../../utils/embeddings');
const fs = require('fs').promises;
const path = require('path');

const REFLECTION_INTERVAL = 15 * 60 * 1000; // 15 minutes
const GHOST_THREADS_PATH = path.join(__dirname, '../../../data/ghost-threads.json');

/**
 * Creates a reflection on a past entry
 */
async function createReflection(entry) {
  try {
    // Get embedding for the entry
    const embedding = await getEmbedding(entry.content);
    
    // Search for related entries
    const related = await searchArchive({
      embedding,
      limit: 5,
      excludeIds: [entry.id]
    });

    // Create a reflection thread
    const reflection = {
      id: Date.now(),
      original: entry,
      echoes: related,
      timestamp: new Date().toISOString(),
      type: 'ghost-reflection'
    };

    // Load existing threads
    let threads = [];
    try {
      const data = await fs.readFile(GHOST_THREADS_PATH, 'utf8');
      threads = JSON.parse(data);
    } catch (err) {
      // File doesn't exist or is empty
    }

    // Add new reflection
    threads.push(reflection);

    // Save updated threads
    await fs.writeFile(GHOST_THREADS_PATH, JSON.stringify(threads, null, 2));

    console.log(`Created reflection for entry ${entry.id}`);
    return reflection;
  } catch (error) {
    console.error('Failed to create reflection:', error);
    throw error;
  }
}

/**
 * Starts the curator service
 */
function startCurator() {
  console.log('Starting Echo Ghosts curator service...');
  
  setInterval(async () => {
    try {
      // Get a random entry from the archive
      const entry = await getRandomEntry();
      if (!entry) return;

      await createReflection(entry);
    } catch (error) {
      console.error('Curator service error:', error);
    }
  }, REFLECTION_INTERVAL);
}

module.exports = {
  startCurator,
  createReflection
}; 