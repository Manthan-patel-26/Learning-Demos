// src/components/ProductFilters.tsx
// Filter and sort controls for the product list.
//
// PERFORMANCE NOTE: Filter changes reset the entire infinite scroll list.
// React Query handles this automatically because the queryKey includes filters.
// When filters change → new queryKey → fresh query → list resets to page 1.

import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '../api/products.js';
import { ProductFilters } from '../types/index.js';

interface ProductFiltersProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
}

export function ProductFiltersBar({ filters, onChange }: ProductFiltersProps) {
  // Fetch categories for the dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // Categories rarely change, cache for 5 min
  });

  const handleChange = (partial: Partial<ProductFilters>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <div className="filters-bar" role="search" aria-label="Product filters">
      {/* Category filter */}
      <div className="filter-group">
        <label htmlFor="category-filter" className="filter-label">
          Category
        </label>
        <select
          id="category-filter"
          value={filters.category ?? ''}
          onChange={(e) => handleChange({ category: e.target.value || undefined })}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>
      </div>

      {/* Sort by */}
      <div className="filter-group">
        <label htmlFor="sort-by" className="filter-label">
          Sort by
        </label>
        <select
          id="sort-by"
          value={filters.sortBy ?? 'createdAt'}
          onChange={(e) =>
            handleChange({ sortBy: e.target.value as ProductFilters['sortBy'] })
          }
          className="filter-select"
        >
          <option value="createdAt">Newest</option>
          <option value="price">Price</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      {/* Sort order */}
      <div className="filter-group">
        <label htmlFor="sort-order" className="filter-label">
          Order
        </label>
        <select
          id="sort-order"
          value={filters.sortOrder ?? 'desc'}
          onChange={(e) =>
            handleChange({ sortOrder: e.target.value as 'asc' | 'desc' })
          }
          className="filter-select"
        >
          <option value="desc">High → Low</option>
          <option value="asc">Low → High</option>
        </select>
      </div>

      {/* Clear filters button */}
      {(filters.category || filters.sortBy !== 'createdAt') && (
        <button
          onClick={() => onChange({ sortBy: 'createdAt', sortOrder: 'desc' })}
          className="clear-filters-btn"
          aria-label="Clear all filters"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}
