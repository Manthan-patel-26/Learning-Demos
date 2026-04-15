# Day 12: React Performance Optimization

**Date:** February 26, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Optimized app rendering 10,000 items with: virtual scrolling (react-window), lazy-loaded analytics tab, React.memo, useMemo, and useCallback — with a toggle to compare naive vs optimized rendering.

## 🚀 How to Run
```bash
cd backend && npm install && npm run dev   # port 3001 (serves 10k items)
cd frontend && npm install && npm start   # port 3000
```

## 🔬 Performance Experiments
1. **Virtual vs Naive**: Click the toggle — switch between rendering 20 DOM nodes vs 10,000
2. **Search**: Type to filter — useMemo prevents re-filtering on unrelated state changes  
3. **Lazy loading**: Click "Analytics" tab — watch DevTools Network for a new JS chunk
4. **React.memo**: Uncomment `console.log("Rendering:", item.id)` in ItemRow — only changed rows log

## 📖 Key Concepts

### react-window Virtual Scrolling
```typescript
// ❌ Naive: 10,000 DOM nodes → browser freezes
{items.map(item => <ItemRow key={item.id} item={item} />)}

// ✅ Virtual: only ~20 DOM nodes, regardless of list size
<FixedSizeList height={500} itemCount={items.length} itemSize={52} width="100%">
  {({ index, style }) => (
    <div style={style}><ItemRow item={items[index]} /></div>
  )}
</FixedSizeList>
```

### When to use each optimization
```
React.memo  → Component re-renders too often with same props
useMemo     → Expensive calculation (>1ms) runs on every render
useCallback → Function passed as prop to memo'd component
React.lazy  → Large component/library only needed sometimes
react-window → List with 100+ items
```

## ⚠️ Premature Optimization Warning
```typescript
// ❌ Don't wrap everything in memo/useMemo — it adds overhead!
// Only optimize what profiling shows is a bottleneck.

// Use React DevTools Profiler:
// 1. Open React DevTools → Profiler tab
// 2. Click Record
// 3. Interact with your app
// 4. Stop recording
// 5. Look for components with high render times (highlighted in red/orange)
```
