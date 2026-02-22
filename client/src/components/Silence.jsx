import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const SilenceContainer = styled(motion.div)`
  width: 100%;
  min-height: 100px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.01);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  @media (max-width: 768px) {
    padding: 1rem;
    min-height: 80px;
    border-radius: 8px;
  }
`;

const SilenceText = styled(motion.p)`
  margin: 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  text-align: center;
  font-style: italic;
`;

const SilenceStats = styled(motion.div)`
  margin-top: 1rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  gap: 2rem;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.span`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.5);
`;

const StatLabel = styled.span`
  margin-top: 0.3rem;
`;

const Silence = () => {
  const [response, setResponse] = useState('');
  const [stats, setStats] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [silenceStart, setSilenceStart] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/silence/stats`);
      setStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching silence stats:', error);
    }
  };

  const handleSilenceClick = async () => {
    if (isRecording) {
      setIsRecording(false);
      const duration = Date.now() - silenceStart;
      
      try {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/silence`, {
          duration,
          context: 'intentional'
        });
        
        setResponse(res.data.response);
        fetchStats();
        
        // Clear response after 5 seconds
        setTimeout(() => setResponse(''), 5000);
      } catch (error) {
        console.error('Error recording silence:', error);
      }
    } else {
      setIsRecording(true);
      setSilenceStart(Date.now());
      setResponse('');
    }
  };

  return (
    <SilenceContainer
      onClick={handleSilenceClick}
      animate={{
        scale: isRecording ? 1.02 : 1,
        background: isRecording ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)'
      }}
    >
      <AnimatePresence mode="wait">
        <SilenceText
          key={response || isRecording}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          {isRecording ? 'Recording silence...' : response || (window.innerWidth <= 768 ? 'Tap to embrace the silence' : 'Click to embrace the silence')}
        </SilenceText>
      </AnimatePresence>

      {stats && (
        <SilenceStats
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <StatItem>
            <StatValue>{stats.total_silences}</StatValue>
            <StatLabel>Total Silences</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{Math.round(stats.total_duration / 1000)}s</StatValue>
            <StatLabel>Total Duration</StatLabel>
          </StatItem>
        </SilenceStats>
      )}
    </SilenceContainer>
  );
};

export default Silence; 