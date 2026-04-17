// src/App.tsx
import { useState } from 'react';
import { ConceptCard } from './components/ConceptCard.js';
import { BrandedDemo } from './components/BrandedDemo.js';
import { CONCEPTS } from './utils/concepts.js';
import { TypeConcept } from './types/index.js';

const CATEGORIES = [
  { id: 'all',              label: 'All Concepts' },
  { id: 'template-literal', label: 'Template Literal' },
  { id: 'conditional',      label: 'Conditional + infer' },
  { id: 'branded',          label: 'Branded Types' },
  { id: 'recursive',        label: 'Recursive Types' },
  { id: 'mapped',           label: 'Mapped Types' },
] as const;

type FilterId = typeof CATEGORIES[number]['id'];

function App() {
  const [filter, setFilter] = useState<FilterId>('all');
  const [activeSection, setActiveSection] = useState<'concepts' | 'demo'>('concepts');

  const filtered = filter === 'all'
    ? CONCEPTS
    : CONCEPTS.filter(c => c.category === (filter as TypeConcept['category']));

  return (
    <div className="app">
      <header className="page-header">
        <h1>Day 29 — Advanced TypeScript</h1>
        <p className="page-subtitle">Template Literals · Conditional Types · Branded Types · Recursive Types</p>
        <div className="header-tabs">
          <button
            className={`header-tab ${activeSection === 'concepts' ? 'header-tab-active' : ''}`}
            onClick={() => setActiveSection('concepts')}
          >📘 Type Concepts</button>
          <button
            className={`header-tab ${activeSection === 'demo' ? 'header-tab-active' : ''}`}
            onClick={() => setActiveSection('demo')}
          >🔬 Live Demo</button>
        </div>
      </header>

      <main className="main-content">
        {activeSection === 'concepts' && (
          <>
            <div className="filter-bar" role="toolbar" aria-label="Filter concepts">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`filter-btn ${filter === cat.id ? 'filter-btn-active' : ''}`}
                  onClick={() => setFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="concepts-grid">
              {filtered.map(concept => (
                <ConceptCard key={concept.id} concept={concept} />
              ))}
            </div>
          </>
        )}
        {activeSection === 'demo' && <BrandedDemo />}
      </main>
    </div>
  );
}

export default App;
