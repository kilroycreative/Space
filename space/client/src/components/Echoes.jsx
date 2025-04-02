import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmotionEmbed } from '../hooks/useEmotionEmbed';
import { format } from 'date-fns';

const getEmotionColor = (emotion) => {
  const emotionColors = {
    ache: 'rgba(255, 99, 71, 0.15)',    // Soft red for pain/sorrow
    drift: 'rgba(135, 206, 235, 0.15)', // Soft blue for wandering/floating
    joy: 'rgba(255, 223, 0, 0.15)',     // Soft yellow for happiness
    peace: 'rgba(144, 238, 144, 0.15)', // Soft green for calm
    // Add more emotion mappings as needed
    default: 'rgba(255, 255, 255, 0.03)' // Default background
  };
  return emotionColors[emotion] || emotionColors.default;
};

const EchoesContainer = styled.div`
  width: 100%;
  min-height: 200px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  backdrop-filter: blur(10px);
`;

const EchoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
`;

const Echo = styled(motion.div)`
  padding: 1.5rem;
  background: ${props => props.emotionColor};
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.87);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${props => props.emotionColor ? `rgba(255, 255, 255, 0.08)` : 'rgba(255, 255, 255, 0.05)'};
    transform: translateY(-2px);
    
    ${EchoTrace} {
      opacity: 1;
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.emotionColor ? props.emotionColor.replace('0.15', '0.5') : 'transparent'};
  }
`;

const EchoText = styled.p`
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
`;

const EchoTimestamp = styled.span`
  display: block;
  margin-top: 1rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
`;

const EmotionGlyph = styled.span`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  font-size: 0.75rem;
  opacity: 0.5;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.4);
`;

const LoadingState = styled(motion.div)`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.4);
`;

const ResonanceIndicator = styled(motion.div)`
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EmotionDetails = styled(motion.div)`
  position: absolute;
  top: 0.75rem;
  right: 2.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DimensionBar = styled.div`
  width: 3px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: ${props => Math.max(0, Math.min(100, (props.value + 1) * 50))}%;
    background: ${props => props.color || 'rgba(255, 255, 255, 0.3)'};
    transition: height 0.3s ease;
  }
`;

const EchoTrace = styled(motion.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
`;

const Echoes = ({ initialContent = [], searchEmbedding = null }) => {
  const [resonantContent, setResonantContent] = useState(initialContent);
  const { findResonantContent, loading, error } = useEmotionEmbed();
  const [activeTrace, setActiveTrace] = useState(null);

  useEffect(() => {
    const searchForResonance = async () => {
      if (searchEmbedding) {
        const results = await findResonantContent(searchEmbedding);
        setResonantContent(results);
      }
    };

    searchForResonance();
  }, [searchEmbedding, findResonantContent]);

  const handleEchoClick = (echo) => {
    // Implement full story view or emotional trace view
    console.log('Echo clicked:', echo);
  };

  const handleMarkResonant = async (event, echo) => {
    event.stopPropagation();
    try {
      // Here you could implement the resonance marking logic
      // For example, storing user's resonance with this echo
      console.log('Marked as resonant:', echo);
    } catch (error) {
      console.error('Error marking resonance:', error);
    }
  };

  const handleTraceClick = async (id) => {
    try {
      const response = await fetch(`/api/trace/${id}`);
      const data = await response.json();
      setActiveTrace(data);
    } catch (error) {
      console.error('Failed to fetch trace:', error);
    }
  };

  if (loading) {
    return (
      <EchoesContainer>
        <LoadingState
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Searching for resonance...
        </LoadingState>
      </EchoesContainer>
    );
  }

  if (error) {
    return (
      <EchoesContainer>
        <EmptyState>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            The void seems disturbed...
          </motion.p>
        </EmptyState>
      </EchoesContainer>
    );
  }

  return (
    <EchoesContainer>
      <AnimatePresence>
        {activeTrace ? (
          <TraceView 
            trace={activeTrace} 
            onClose={() => setActiveTrace(null)} 
          />
        ) : (
          resonantContent.length > 0 ? (
            <EchoGrid>
              {resonantContent.map((echo) => (
                <Echo
                  key={echo.id}
                  emotionColor={getEmotionColor(echo.emotion)}
                  onClick={() => handleEchoClick(echo)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {echo.emotion && (
                    <>
                      <EmotionGlyph title={`Emotional tone: ${echo.emotion}`}>
                        {echo.emotion === 'ache' ? '💔' : 
                         echo.emotion === 'drift' ? '🌊' :
                         echo.emotion === 'joy' ? '✨' :
                         echo.emotion === 'peace' ? '🍃' :
                         echo.emotion === 'wonder' ? '🌟' :
                         echo.emotion === 'melancholy' ? '🌙' :
                         echo.emotion === 'resonance' ? '🎭' :
                         echo.emotion === 'tension' ? '⚡' :
                         echo.emotion === 'emergence' ? '🌱' :
                         echo.emotion === 'echo' ? '🔮' : '💭'}
                      </EmotionGlyph>
                      <EmotionDetails>
                        {echo.emotion_details?.dimensions && 
                          Object.entries(echo.emotion_details.dimensions)
                            .slice(0, 3) // Show first 3 dimensions
                            .map(([dim, value]) => (
                              <DimensionBar 
                                key={dim}
                                value={value}
                                title={`${dim}: ${Math.round(value * 100)}%`}
                                color={
                                  dim === 'intensity' ? 'rgba(255, 99, 71, 0.5)' :
                                  dim === 'valence' ? 'rgba(144, 238, 144, 0.5)' :
                                  dim === 'resonance' ? 'rgba(135, 206, 235, 0.5)' :
                                  'rgba(255, 255, 255, 0.3)'
                                }
                              />
                            ))
                        }
                      </EmotionDetails>
                    </>
                  )}
                  <ResonanceIndicator
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {echo.similarity ? `${Math.round(echo.similarity * 100)}% ✧` : ''}
                  </ResonanceIndicator>
                  <EchoText>{echo.content}</EchoText>
                  <EchoTimestamp>
                    {format(new Date(echo.timestamp), 'MMM d, yyyy')}
                  </EchoTimestamp>
                  {echo.echo_trace && (
                    <EchoTrace
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      whileHover={{ opacity: 1 }}
                    >
                      Resonance: {Math.round(echo.echo_trace.resonance_score * 100)}%
                      {echo.echo_trace.emotional_context && 
                        ` • Context: ${Object.entries(echo.echo_trace.emotional_context)
                          .map(([dim, val]) => `${dim}: ${Math.round(val * 100)}%`)
                          .join(' | ')}`
                      }
                    </EchoTrace>
                  )}
                </Echo>
              ))}
            </EchoGrid>
          ) : (
            <EmptyState>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
              >
                The void is listening...
              </motion.p>
            </EmptyState>
          )
        )}
      </AnimatePresence>
    </EchoesContainer>
  );
};

const TraceView = ({ trace, onClose }) => {
  return (
    <motion.div
      className="trace-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="trace-header">
        <h3>Emotional Lineage</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="trace-timeline">
        {trace.lineage.map((echo, index) => (
          <motion.div
            key={echo.id}
            className="trace-echo"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="trace-line" />
            <div className="trace-content">
              <p>{echo.content}</p>
              <span className="trace-timestamp">
                {format(new Date(echo.timestamp), 'MMM d, yyyy')}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Echoes; 