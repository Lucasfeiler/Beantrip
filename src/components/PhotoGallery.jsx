import { useState, useRef } from 'react';
import { ShopThumb } from './ShopCard';

export default function PhotoGallery({ shop, className = '', priority = false }) {
  const images = shop.images?.length > 0 ? shop.images : shop.image ? [shop.image] : [];
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(null);
  const draggedFar = useRef(false);

  if (images.length === 0) {
    return <ShopThumb shop={shop} className={className} />;
  }

  const goTo = (i) => setIndex((i + images.length) % images.length);

  // Pointer events cover touch, mouse, and pen in one API, so drag-to-swipe
  // works with a mouse on desktop the same way a finger swipe does on mobile.
  // Pointer capture is essential here: a real swipe naturally drifts outside
  // the element's bounds mid-gesture, and without capture the "up" event
  // fires on whatever's under the pointer at that moment, not this element.
  const handlePointerDown = (e) => {
    // Skip drag tracking when the press starts on a button (arrows, dots) --
    // grabbing pointer capture here would hijack that button's own click.
    if (e.target.closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartX.current = e.clientX;
    draggedFar.current = false;
    setDragging(true);
  };

  const handlePointerMove = (e) => {
    if (dragStartX.current == null) return;
    if (Math.abs(e.clientX - dragStartX.current) > 10) draggedFar.current = true;
  };

  const handlePointerUp = (e) => {
    if (dragStartX.current == null) return;
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(index + (delta < 0 ? 1 : -1));
    }
    dragStartX.current = null;
    setDragging(false);
  };

  // When this gallery sits inside a clickable card (e.g. a Link to the shop
  // page), a completed drag still fires a click afterward on whatever's
  // underneath -- swallow that one click so swiping doesn't also navigate.
  const handleClickCapture = (e) => {
    if (draggedFar.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedFar.current = false;
    }
  };

  const stopAnd = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div
      className={`relative overflow-hidden group touch-pan-y ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { dragStartX.current = null; setDragging(false); }}
      onClickCapture={handleClickCapture}
    >
      <img
        src={images[index]}
        alt={`${shop.name} photo ${index + 1} of ${images.length}`}
        loading={priority ? 'eager' : 'lazy'}
        className="w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />

      {images.length > 1 && (
        <>
          <button
            onClick={stopAnd(() => goTo(index - 1))}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ‹
          </button>
          <button
            onClick={stopAnd(() => goTo(index + 1))}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ›
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={stopAnd(() => goTo(i))}
                aria-label={`Go to photo ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-white w-4' : 'bg-white/50'}`}
              />
            ))}
          </div>

          <span className="absolute top-2 right-2 text-xs font-semibold text-white bg-black/50 px-2 py-0.5 rounded-full">
            {index + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}
