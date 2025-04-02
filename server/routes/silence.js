const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { getEmbedding } = require('../utils/embeddings');
const { searchArchive } = require('../utils/archive');

// Tags that represent silence/peace
const SILENCE_TAGS = ['peace', 'drift', 'quiet'];

// Record moments of silence
router.post('/', async (req, res) => {
  try {
    // Check if we should generate a poetic thought (20% chance)
    const shouldGeneratePoem = Math.random() < 0.2;
    
    if (shouldGeneratePoem) {
      // Generate a contemplative thought
      const silencePrompts = [
        'The space between words...',
        'In the quiet, we find...',
        'Silence speaks in...',
        'Between breaths...',
        'The void whispers...'
      ];
      const prompt = silencePrompts[Math.floor(Math.random() * silencePrompts.length)];
      
      // TODO: Integrate with your text generation service
      // For now, we'll just return the prompt
      return res.json({
        type: 'generated',
        content: prompt,
        tags: ['generated', 'silence'],
        timestamp: new Date().toISOString()
      });
    }

    // 30% chance of returning nothing
    if (Math.random() < 0.3) {
      return res.json({
        type: 'void',
        content: null,
        timestamp: new Date().toISOString()
      });
    }

    // Otherwise, find a peaceful entry from the archive
    const silenceEmbedding = await getEmbedding('silence peace tranquility');
    const results = await searchArchive({
      embedding: silenceEmbedding,
      tags: SILENCE_TAGS,
      limit: 1
    });

    if (results.length === 0) {
      return res.json({
        type: 'void',
        content: null,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      type: 'archive',
      ...results[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Silence Engine Error:', error);
    res.status(500).json({ error: 'Failed to process silence' });
  }
});

// Get silence statistics
router.get('/stats', async (req, res) => {
  try {
    const silencePath = path.join(__dirname, '../../data/silence.json');
    let silences = [];
    
    try {
      const data = await fs.readFile(silencePath, 'utf8');
      silences = JSON.parse(data);
    } catch (err) {
      // File doesn't exist or is empty
    }

    const stats = {
      total_silences: silences.length,
      total_duration: silences.reduce((sum, s) => sum + s.duration, 0),
      intentional_count: silences.filter(s => s.context === 'intentional').length,
      natural_count: silences.filter(s => s.context === 'natural').length,
      latest_silence: silences[silences.length - 1] || null
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting silence stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get silence statistics' 
    });
  }
});

module.exports = router; 