import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useGesture } from 'react-use-gesture';
import { useEmotionEmbed } from '../hooks/useEmotionEmbed';

const CanvasContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
  min-height: 50vh;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    min-height: 40vh;
    border-radius: 8px;
  }
`;

const InfiniteCanvas = styled(motion.div)`
  width: 200%;
  height: 200%;
  position: absolute;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`;

const TextInput = styled.textarea`
  position: absolute;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.87);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.2rem;
  resize: none;
  outline: none;
  padding: 1rem;
  width: 300px;
  height: 150px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  &.processing {
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    width: 240px;
    height: 120px;
    font-size: 1rem;
    padding: 0.75rem;
  }

  @media (max-width: 480px) {
    width: 200px;
    height: 100px;
    font-size: 0.9rem;
  }
`;

const ProcessingIndicator = styled(motion.div)`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
`;

const SubmitButton = styled.button`
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s ease;

  &:hover, &:active {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.87);
  }
`;

const MobileAddButton = styled.button`
  display: none;
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.5rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  z-index: 10;
  transition: all 0.2s ease;

  &:active {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const Canvas = ({ onInputProcessed }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [inputs, setInputs] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const canvasRef = useRef(null);
  const { generateEmbedding, loading } = useEmotionEmbed();

  const bind = useGesture({
    onDrag: ({ movement: [mx, my], first, last }) => {
      if (first) canvasRef.current.style.cursor = 'grabbing';
      if (last) canvasRef.current.style.cursor = 'grab';

      setPosition({
        x: mx,
        y: my
      });
    }
  });

  const addInput = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left - position.x;
    const y = clientY - rect.top - position.y;
    setInputs(prev => [...prev, { id: Date.now(), x, y, text: '' }]);
  }, [position]);

  const handleDoubleClick = (e) => {
    addInput(e.clientX, e.clientY);
  };

  const handleMobileAdd = () => {
    // Place input near center of canvas viewport
    const rect = canvasRef.current.getBoundingClientRect();
    const x = rect.width / 2 - position.x - 120;
    const y = rect.height / 2 - position.y - 60;
    setInputs(prev => [...prev, { id: Date.now(), x, y, text: '' }]);
  };

  const handleInputChange = (id, value) => {
    setInputs(inputs.map(input =>
      input.id === id ? { ...input, text: value } : input
    ));
  };

  const handleInputSubmit = async (id) => {
    const input = inputs.find(i => i.id === id);
    if (!input || !input.text.trim()) return;

    try {
      setProcessingId(id);

      // Generate emotional embedding
      const embedding = await generateEmbedding(input.text);

      if (embedding) {
        // Notify parent component
        onInputProcessed(embedding);

        // Remove the input from canvas after successful processing
        setInputs(inputs.filter(i => i.id !== id));
      }
    } catch (err) {
      console.error('Failed to process input:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <CanvasContainer>
      <InfiniteCanvas
        ref={canvasRef}
        {...bind()}
        style={{ x: position.x, y: position.y }}
        onDoubleClick={handleDoubleClick}
      >
        {inputs.map(input => (
          <div key={input.id} style={{ position: 'absolute', left: input.x, top: input.y }}>
            <TextInput
              className={processingId === input.id ? 'processing' : ''}
              value={input.text}
              onChange={(e) => handleInputChange(input.id, e.target.value)}
              placeholder="Share your thoughts with the void..."
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onContextMenu={(e) => {
                e.preventDefault();
                handleInputSubmit(input.id);
              }}
            />
            <SubmitButton
              onClick={(e) => {
                e.stopPropagation();
                handleInputSubmit(input.id);
              }}
              onTouchStart={(e) => e.stopPropagation()}
            >
              Send
            </SubmitButton>
            {processingId === input.id && (
              <ProcessingIndicator
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                Processing...
              </ProcessingIndicator>
            )}
          </div>
        ))}
      </InfiniteCanvas>
      <MobileAddButton onClick={handleMobileAdd} aria-label="Add thought">
        +
      </MobileAddButton>
    </CanvasContainer>
  );
};

export default Canvas;
