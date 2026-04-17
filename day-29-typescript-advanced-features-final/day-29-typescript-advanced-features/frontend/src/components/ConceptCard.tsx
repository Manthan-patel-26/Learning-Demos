// src/components/ConceptCard.tsx
import { useState } from 'react';
import { TypeConcept } from '../types/index.js';

const CATEGORY_COLORS: Record<TypeConcept['category'], string> = {
  'template-literal': '#6366f1',
  'conditional':      '#8b5cf6',
  'branded':          '#ec4899',
  'recursive':        '#14b8a6',
  'mapped':           '#f59e0b',
};

const DIFFICULTY_LABELS: Record<TypeConcept['difficulty'], string> = {
  'intermediate': '◆ Intermediate',
  'advanced':     '◆◆ Advanced',
  'expert':       '◆◆◆ Expert',
};

interface ConceptCardProps {
  concept: TypeConcept;
}

export function ConceptCard({ concept }: ConceptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORY_COLORS[concept.category];

  return (
    <article
      className={`concept-card ${expanded ? 'concept-card-expanded' : ''}`}
      style={{ '--accent': color } as React.CSSProperties}
    >
      <div className="concept-header" onClick={() => setExpanded(e => !e)}>
        <div className="concept-header-left">
          <span className="concept-category-dot" style={{ background: color }} aria-hidden="true" />
          <h3 className="concept-title">{concept.title}</h3>
        </div>
        <div className="concept-header-right">
          <span className="concept-difficulty">{DIFFICULTY_LABELS[concept.difficulty]}</span>
          <span className="concept-chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <p className="concept-description">{concept.description}</p>

      {expanded && (
        <div className="concept-body">
          <div className="concept-section">
            <h4 className="concept-section-title">🔴 Problem</h4>
            <p className="concept-text">{concept.problem}</p>
          </div>
          <div className="concept-section">
            <h4 className="concept-section-title">✅ Solution</h4>
            <p className="concept-text">{concept.solution}</p>
          </div>
          <div className="concept-section">
            <h4 className="concept-section-title">💻 Code Example</h4>
            <pre className="concept-code"><code>{concept.codeExample}</code></pre>
          </div>
          <div className="concept-compiles-to">
            <span className="compiles-label">Runtime cost:</span>
            <span className="compiles-value">{concept.compilesTo}</span>
          </div>
        </div>
      )}
    </article>
  );
}
