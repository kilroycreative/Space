const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');

async function readArchive(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function getRandomEntry(filename = 'entries.json') {
  const entries = await readArchive(filename);
  if (!entries.length) return null;
  const randomIndex = Math.floor(Math.random() * entries.length);
  return entries[randomIndex];
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

async function searchArchive({ embedding, limit = 5, threshold = 0.7, excludeIds = [], filename = 'entries.json' }) {
  const entries = await readArchive(filename);

  const scored = entries
    .filter(entry => !excludeIds.includes(entry.id))
    .map(entry => ({
      ...entry,
      similarity: cosineSimilarity(entry.embedding, embedding)
    }))
    .filter(entry => entry.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

module.exports = {
  readArchive,
  getRandomEntry,
  searchArchive
};