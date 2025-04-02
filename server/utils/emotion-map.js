// Emotional dimensions based on the circumplex model of affect
// with additional nuanced dimensions for digital experience

const EMOTION_DIMENSIONS = {
  // Core affect dimensions
  valence: {
    positive: 1,
    negative: -1,
    description: 'The pleasantness or unpleasantness of an emotion'
  },
  arousal: {
    high: 1,
    low: -1,
    description: 'The intensity or energy level of an emotion'
  },
  
  // Additional dimensions for digital space
  presence: {
    connected: 1,
    isolated: -1,
    description: 'Sense of connection or isolation in digital space'
  },
  temporality: {
    immediate: 1,
    eternal: -1,
    description: 'Perception of time and permanence'
  },
  resonance: {
    harmonic: 1,
    dissonant: -1,
    description: 'How emotions harmonize or clash with others'
  }
};

// Emotion vectors are combinations of dimensional values
const EMOTION_VECTORS = {
  wonder: {
    valence: 0.8,
    arousal: 0.3,
    presence: 0.5,
    temporality: -0.7,
    resonance: 0.9
  },
  melancholy: {
    valence: -0.4,
    arousal: -0.6,
    presence: -0.3,
    temporality: -0.8,
    resonance: 0.2
  },
  serenity: {
    valence: 0.6,
    arousal: -0.7,
    presence: 0.1,
    temporality: -0.5,
    resonance: 0.8
  },
  // Add more emotion vectors as needed
};

// Calculate similarity between two emotion vectors
const calculateSimilarity = (vector1, vector2) => {
  const dimensions = Object.keys(EMOTION_DIMENSIONS);
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  dimensions.forEach(dim => {
    dotProduct += (vector1[dim] || 0) * (vector2[dim] || 0);
    magnitude1 += Math.pow(vector1[dim] || 0, 2);
    magnitude2 += Math.pow(vector2[dim] || 0, 2);
  });

  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
};

// Map raw text to emotion vector using simple keyword matching
// In production, this would use more sophisticated NLP
const mapTextToEmotion = (text) => {
  const vector = {
    valence: 0,
    arousal: 0,
    presence: 0,
    temporality: 0,
    resonance: 0
  };

  // Simple keyword-based mapping
  const words = text.toLowerCase().split(/\s+/);
  words.forEach(word => {
    // Example mappings - expand based on your needs
    if (['happy', 'joy', 'love'].includes(word)) {
      vector.valence += 0.3;
      vector.arousal += 0.2;
    }
    if (['sad', 'lonely', 'empty'].includes(word)) {
      vector.valence -= 0.3;
      vector.presence -= 0.2;
    }
    // Add more mappings
  });

  // Normalize values to [-1, 1]
  Object.keys(vector).forEach(dim => {
    vector[dim] = Math.max(-1, Math.min(1, vector[dim]));
  });

  return vector;
};

module.exports = {
  EMOTION_DIMENSIONS,
  EMOTION_VECTORS,
  calculateSimilarity,
  mapTextToEmotion
}; 