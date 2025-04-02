const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Get embedding for text content using OpenAI's text-embedding-ada-002 model
 * @param {string} content - Text to generate embedding for
 * @returns {Promise<number[]>} - Vector embedding
 */
async function getEmbedding(content) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

module.exports = { getEmbedding }; 