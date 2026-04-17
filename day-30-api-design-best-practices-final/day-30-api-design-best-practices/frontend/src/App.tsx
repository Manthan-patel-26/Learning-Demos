// src/App.tsx
import { ApiExplorer } from './components/ApiExplorer.js';

function App() {
  return (
    <div className="app">
      <header className="page-header">
        <div className="header-inner">
          <div>
            <h1>Day 30 — API Design Best Practices</h1>
            <p className="page-subtitle">
              Versioning · HATEOAS · Consistent Errors · OpenAPI · PATCH vs PUT · ETags
            </p>
          </div>
          <div className="header-badges">
            <span className="badge badge-green">v1 Active</span>
            <span className="badge badge-blue">v2 Active</span>
            <span className="badge badge-purple">OpenAPI</span>
          </div>
        </div>
      </header>
      <ApiExplorer />
    </div>
  );
}

export default App;
