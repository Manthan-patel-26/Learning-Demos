// src/App.tsx
import { Gallery } from './components/Gallery.js';

function App() {
  return (
    <div className="app">
      <header className="page-header">
        <h1>Image Gallery</h1>
        <p className="page-subtitle">
          Lazy loading · Blur-up placeholders · WebP with JPEG fallback · Zero CLS
        </p>
      </header>
      <main className="main-content">
        <Gallery />
      </main>
    </div>
  );
}

export default App;
