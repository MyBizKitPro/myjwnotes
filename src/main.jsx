import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import MyJWNotes from './MyJWNotes.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MyJWNotes />
  </StrictMode>
);