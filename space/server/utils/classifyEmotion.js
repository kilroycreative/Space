const emotionVectors = {
  // Core emotional states
  ache: [0.9, 0.1, -0.6, -0.4, 0.2],    // Pain with subtle hope
  drift: [0.2, -0.8, 0.7, 0.3, -0.1],   // Floating uncertainty
  joy: [0.8, 0.9, 0.2, 0.7, 0.8],       // Pure elation
  peace: [-0.3, 0.6, 0.5, 0.4, 0.7],    // Tranquil acceptance
  
  // Nuanced states
  wonder: [0.5, 0.3, 0.8, 0.9, 0.4],    // Curious amazement
  melancholy: [-0.4, -0.2, 0.3, -0.5, 0.6], // Beautiful sadness
  resonance: [0.3, 0.7, 0.8, 0.6, 0.9],  // Deep connection
  tension: [0.7, -0.5, -0.3, 0.2, -0.4], // Creative friction
  emergence: [0.4, 0.6, 0.9, 0.8, 0.5],  // New understanding
  echo: [0.2, 0.4, 0.7, 0.5, 0.8]        // Remembered feeling
};

// Emotional dimensions for interpretability
const DIMENSIONS = [
  'intensity',    // Strength of the emotion
  'valence',      // Positive vs negative
  'activation',   // Active vs passive
  'clarity',      // Clear vs ambiguous
  'resonance'     // How strongly it connects
];

const cosineSimilarity = (a, b) => {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
};

const classifyEmotion = (embedding) => {
  let maxSim = -Infinity;
  let matchedEmotion = 'default';
  let dimensionalScores = {};

  // Get dimensional interpretation
  DIMENSIONS.forEach((dim, i) => {
    dimensionalScores[dim] = embedding[i] || 0;
  });

  // Find closest emotion
  for (const [emotion, vector] of Object.entries(emotionVectors)) {
    const sim = cosineSimilarity(embedding.slice(0, vector.length), vector);
    if (sim > maxSim) {
      maxSim = sim;
      matchedEmotion = emotion;
    }
  }

  return {
    primary: matchedEmotion,
    confidence: maxSim,
    dimensions: dimensionalScores
  };
};

module.exports = { classifyEmotion, DIMENSIONS, emotionVectors };