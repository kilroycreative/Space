import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import styled from 'styled-components';

import Canvas from './components/Canvas';
import Echoes from './components/Echoes';
import Silence from './components/Silence';

// Create a foggy, ethereal theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0a0a',
      paper: 'rgba(255, 255, 255, 0.05)',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
    }
  },
  typography: {
    fontFamily: '"Space Grotesk", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
          }
        }
      }
    }
  }
});

const AppContainer = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr auto;
  gap: 2rem;
  padding: 2rem;
  background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%);

  @media (max-width: 768px) {
    gap: 1rem;
    padding: 1rem;
  }

  @media (max-width: 480px) {
    gap: 0.75rem;
    padding: 0.75rem;
  }
`;

const App = () => {
  const [currentEmbedding, setCurrentEmbedding] = useState(null);

  const handleInputProcessed = (embedding) => {
    setCurrentEmbedding(embedding);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContainer>
        <Canvas onInputProcessed={handleInputProcessed} />
        <Echoes searchEmbedding={currentEmbedding} />
        <Silence />
      </AppContainer>
    </ThemeProvider>
  );
};

export default App; 