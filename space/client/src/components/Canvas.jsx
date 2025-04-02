import React, { useState, useRef } from 'react';
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
`;

const ProcessingIndicator = styled(motion.div)`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
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

  const handleDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - position.x;
    const y = e.clientY - rect.top - position.y;

    setInputs([...inputs, { id: Date.now(), x, y, text: '' }]);
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
              onContextMenu={(e) => {
                e.preventDefault();
                handleInputSubmit(input.id);
              }}
            />
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
    </CanvasContainer>
  );
};

export default Canvas; 