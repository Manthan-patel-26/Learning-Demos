// src/components/SearchInput.tsx
// The search input with autocomplete dropdown.
//
// KEYBOARD NAVIGATION (WCAG 2.1 Combobox pattern):
//   ArrowDown  → move highlight down the suggestion list
//   ArrowUp    → move highlight up
//   Enter      → select highlighted suggestion or submit query
//   Escape     → close dropdown, return focus to input
//   Tab        → close dropdown (natural focus movement)
//
// ARIA roles:
//   role="combobox"   → announces this as an autocomplete input
//   aria-expanded     → whether the suggestion list is visible
//   aria-activedescendant → which suggestion is currently highlighted
//   role="listbox"    → the suggestion container
//   role="option"     → each suggestion item

import { useRef, useState, KeyboardEvent } from 'react';
import { SearchSuggestion } from '../types/index.js';

interface SearchInputProps {
  query: string;
  suggestions: SearchSuggestion[];
  isTyping: boolean;
  isFetchingSuggestions: boolean;
  error: string | null;
  onChange: (q: string) => void;
  onSubmit: (q?: string) => void;
  onClear: () => void;
  onCloseSuggestions: () => void;
}

export function SearchInput({
  query,
  suggestions,
  isTyping,
  isFetchingSuggestions,
  error,
  onChange,
  onSubmit,
  onClear,
  onCloseSuggestions,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);  // -1 = nothing highlighted

  const showDropdown = (suggestions.length > 0 || isFetchingSuggestions || isTyping) && query.length > 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault(); // Prevent cursor moving to end of input
        setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => {
          if (prev <= 0) {
            // At top of list → jump back to input
            return -1;
          }
          return prev - 1;
        });
        break;

      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          // Select the highlighted suggestion
          const selected = suggestions[activeIndex];
          onChange(selected.text);
          onSubmit(selected.text);
        } else {
          // Submit the typed query
          onSubmit();
        }
        setActiveIndex(-1);
        onCloseSuggestions();
        break;

      case 'Escape':
        onCloseSuggestions();
        setActiveIndex(-1);
        inputRef.current?.focus();
        break;

      case 'Tab':
        // Natural tab movement — close dropdown gracefully
        onCloseSuggestions();
        setActiveIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    onSubmit(suggestion.text);
    onCloseSuggestions();
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  // Show loading indicator in the input area
  const showSpinner = isTyping || isFetchingSuggestions;

  return (
    <div className="search-wrapper">
      <div
        className="search-input-container"
        // Combobox pattern: wraps the input + listbox
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-owns="search-suggestions"
      >
        {/* Search icon */}
        <span className="search-icon" aria-hidden="true">🔍</span>

        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="Search products... (try 'sony', 'wireless', 'book')"
          value={query}
          onChange={e => {
            onChange(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          // Link input to listbox for screen readers
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
          }
          aria-label="Search products"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        {/* Loading spinner (shows while debounce is pending OR fetching) */}
        {showSpinner && (
          <span className="search-spinner" aria-label="Searching..." role="status">
            <span className="spinner" aria-hidden="true" />
          </span>
        )}

        {/* Clear button */}
        {query && !showSpinner && (
          <button
            className="search-clear"
            onClick={onClear}
            aria-label="Clear search"
            tabIndex={0}
          >
            ✕
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="search-error" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <ul
          id="search-suggestions"
          ref={listRef}
          className="suggestions-list"
          role="listbox"
          aria-label="Search suggestions"
        >
          {/* Loading state inside dropdown */}
          {(isTyping || isFetchingSuggestions) && suggestions.length === 0 && (
            <li className="suggestion-loading" role="option" aria-selected="false">
              <span className="spinner-inline" /> Searching...
            </li>
          )}

          {/* Suggestion items */}
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`suggestion-${index}`}
              className={`suggestion-item ${index === activeIndex ? 'suggestion-active' : ''}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleSuggestionClick(suggestion)}
              // Mouse hover syncs keyboard highlight index for consistent UX
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span
                className="suggestion-text"
                // Safe: HTML is server-generated from known product data with <mark> tags only
                dangerouslySetInnerHTML={{ __html: suggestion.highlight }}
              />
              <span className="suggestion-category">{suggestion.category}</span>
            </li>
          ))}

          {/* "Press Enter to search for X" hint */}
          {query && !isTyping && !isFetchingSuggestions && (
            <li
              className="suggestion-search-all"
              role="option"
              aria-selected={false}
              onClick={() => { onSubmit(); onCloseSuggestions(); }}
            >
              <span>🔍 Search for "<strong>{query}</strong>"</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
