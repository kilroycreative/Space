const express = require('express');
const router = express.Router();
const { searchArchive, getEntryById } = require('../utils/archive');
const { getEmbedding } = require('../utils/embeddings');

const SIMILARITY_THRESHOLD = 0.65;

/**
 * Traces the emotional lineage of an entry
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the original entry
    const originalEntry = await getEntryById(id);
    if (!originalEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Get embedding for the entry
    const embedding = await getEmbedding(originalEntry.content);
    
    // Search for emotionally similar entries
    const similar = await searchArchive({
      embedding,
      limit: 20,
      minSimilarity: SIMILARITY_THRESHOLD,
      excludeIds: [id]
    });

    // Sort by timestamp
    const sorted = similar.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Structure the response
    const trace = {
      original: originalEntry,
      lineage: sorted,
      timestamp: new Date().toISOString()
    };

    res.json(trace);
  } catch (error) {
    console.error('Trace Engine Error:', error);
    res.status(500).json({ error: 'Failed to trace emotional lineage' });
  }
});

module.exports = router; 