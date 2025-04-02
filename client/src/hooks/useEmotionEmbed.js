import { useState, useCallback } from 'react';
import axios from 'axios';

const useEmotionEmbed = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateEmbedding = useCallback(async (input, type = 'text') => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/input`, {
        content: input,
        type
      });

      return response.data.embedding;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const findResonantContent = useCallback(async (embedding) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/search`, {
        embedding
      });

      return response.data.results;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    generateEmbedding,
    findResonantContent,
    loading,
    error
  };
};

export default useEmotionEmbed; 