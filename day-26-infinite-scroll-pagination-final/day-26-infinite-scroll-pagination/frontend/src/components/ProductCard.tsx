// src/components/ProductCard.tsx
// Individual product card with image lazy loading and accessibility.
//
// ACCESSIBILITY NOTES:
// - Uses <article> for semantic meaning (each product is a self-contained item)
// - Alt text describes the image meaningfully
// - Rating uses aria-label for screen readers ("4.2 out of 5 stars")
// - Price uses visually-hidden label for screen readers

import { Product } from '../types/index.js';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;

  return (
    <article
      className="product-card"
      aria-label={`${product.name}, $${product.price.toFixed(2)}`}
    >
      {/* Image container with aspect-ratio to prevent CLS (Cumulative Layout Shift) */}
      {/* Setting explicit dimensions reserves space before image loads */}
      <div className="product-image-wrapper" aria-hidden="true">
        <img
          src={product.imageUrl}
          alt={`${product.name} product image`}
          loading="lazy"          /* Native lazy loading - browser handles it */
          decoding="async"        /* Non-blocking image decode */
          width={400}
          height={300}
          className="product-image"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).src =
              'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image';
          }}
        />
        <span className="product-category">{product.category}</span>
      </div>

      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>

        {/* Star rating - aria-label gives screen readers full context */}
        <div
          className="product-rating"
          role="img"
          aria-label={`Rated ${product.rating.toFixed(1)} out of 5 stars, ${product.reviewCount} reviews`}
        >
          <span className="stars" aria-hidden="true">
            {renderStars(product.rating)}
          </span>
          <span className="review-count">({product.reviewCount.toLocaleString()})</span>
        </div>

        <div className="product-footer">
          {/* Price with semantic markup */}
          <p className="product-price">
            <span className="sr-only">Price: </span>
            ${product.price.toFixed(2)}
          </p>

          {/* Stock status */}
          {isOutOfStock && (
            <span className="stock-badge out-of-stock" role="status">
              Out of Stock
            </span>
          )}
          {isLowStock && (
            <span className="stock-badge low-stock" role="status">
              Only {product.stock} left
            </span>
          )}
          {!isOutOfStock && !isLowStock && (
            <span className="stock-badge in-stock" aria-hidden="true">
              In Stock
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Renders filled/half/empty star characters based on rating */
function renderStars(rating: number): string {
  const filled = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const empty = 5 - filled - (hasHalf ? 1 : 0);
  return '★'.repeat(filled) + (hasHalf ? '½' : '') + '☆'.repeat(empty);
}
