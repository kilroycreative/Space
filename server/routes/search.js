const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { calculateSimilarity } = require('../utils/emotion-map');

router.post('/', async (req, res) => {
  try {
    const { embedding } = req.body;

    if (!embedding) {
      return res.status(400).json({
        success: false,
        error: 'Embedding is required'
      });
    }

    // Read all entries
    const entriesPath = path.join(__dirname, '../../data/entries.json');
    let entries = [];
    try {
      const data = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(data);
    } catch (err) {
      // No entries yet
      return res.json({ success: true, results: [] });
    }

    // Find resonant content
    const results = entries
      .map(entry => ({
        ...entry,
        similarity: calculateSimilarity(embedding, entry.embedding)
      }))
      .filter(entry => entry.similarity > 0.7) // Threshold for resonance
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Return top 5 most resonant entries

    // Store the search result as an echo
    const echo = {
      id: Date.now(),
      sourceEmbedding: embedding,
      results: results.map(r => r.id),
      timestamp: new Date().toISOString()
    };

    const echoesPath = path.join(__dirname, '../../data/echoes.json');
    let echoes = [];
    try {
      const data = await fs.readFile(echoesPath, 'utf8');
      echoes = JSON.parse(data);
    } catch (err) {
      // File doesn't exist or is empty
    }

    echoes.push(echo);
    await fs.writeFile(echoesPath, JSON.stringify(echoes, null, 2));

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error searching for resonant content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search for resonant content'
    });
  }
});

module.exports = router; 