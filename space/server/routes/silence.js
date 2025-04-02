const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Record moments of silence
router.post('/', async (req, res) => {
  try {
    const silence = {
      id: Date.now(),
      duration: req.body.duration || 0, // Duration in milliseconds
      context: req.body.context || 'intentional', // intentional or natural
      timestamp: new Date().toISOString()
    };

    const silencePath = path.join(__dirname, '../../data/silence.json');
    let silences = [];
    
    try {
      const data = await fs.readFile(silencePath, 'utf8');
      silences = JSON.parse(data);
    } catch (err) {
      // File doesn't exist or is empty
    }

    silences.push(silence);
    await fs.writeFile(silencePath, JSON.stringify(silences, null, 2));

    // Generate a poetic response to silence
    const responses = [
      'The void acknowledges your presence.',
      'In silence, meaning resonates.',
      'Empty spaces hold infinite potential.',
      'Your silence echoes through digital space.',
      'Nothing speaks volumes.'
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    res.json({ 
      success: true, 
      silence_id: silence.id,
      response 
    });
  } catch (error) {
    console.error('Error recording silence:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to record silence' 
    });
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