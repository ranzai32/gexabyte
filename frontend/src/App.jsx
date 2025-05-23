import React from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage'; 
import './App.css';

function App() {
 
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <HomePage />
      </main>
    </div>
  );
}

export default App
