const express = require('express');
const router = express.Router();
const { classifyEmotion } = require('../utils/classifyEmotion');
const { getEmbedding } = require('../utils/embeddings');
const fs = require('fs').promises;
const path = require('path');

// Handle text input
router.post('/', async (req, res) => {
  try {
    const { text, type = 'text' } = req.body;
    const content = text;
    
    let embedding;
    let emotionDetails;
    
    if (type === 'text') {
      // Get emotional embedding from OpenAI
      embedding = await getEmbedding(content);
      
      // Get detailed emotion classification
      emotionDetails = classifyEmotion(embedding);
      
      // Store the entry with echo trace
      const entry = {
        id: Date.now(),
        content,
        type,
        embedding,
        emotion: emotionDetails.primary,
        emotion_details: {
          confidence: emotionDetails.confidence,
          dimensions: emotionDetails.dimensions
        },
        echo_trace: {
          timestamp: new Date().toISOString(),
          resonance_score: emotionDetails.dimensions.resonance,
          emotional_context: emotionDetails.dimensions
        },
        timestamp: new Date().toISOString()
      };

      const entriesPath = path.join(__dirname, '../../data/entries.json');
      let entries = [];
      
      try {
        const data = await fs.readFile(entriesPath, 'utf8');
        entries = JSON.parse(data);
      } catch (err) {
        // File doesn't exist or is empty, start with empty array
      }

      entries.push(entry);
      await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));

      // Return both embedding and emotion details
      res.json({ 
        success: true, 
        embedding,
        emotion: emotionDetails.primary,
        emotion_details: {
          confidence: emotionDetails.confidence,
          dimensions: emotionDetails.dimensions
        }
      });
    } else {
      // Handle other types (audio/image) in future iterations
      res.status(400).json({ 
        success: false, 
        error: `Input type '${type}' not yet supported` 
      });
    }
  } catch (error) {
    console.error('Error processing input:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process input'
    });
  }
});

module.exports = router; 