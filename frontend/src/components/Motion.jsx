import { useEffect, useRef, useState } from 'react';

/** Fires once when the element first scrolls into view. */
export function useInView(options = { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return undefined;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, options);
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return [ref, inView];
}

/** Fades and lifts its children in when scrolled into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Counts up to `value` the first time it is seen. */
export function CountUp({ value = 0, duration = 1400, className = '', format = (n) => n.toLocaleString() }) {
  const [ref, inView] = useInView();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const target = Number(value) || 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}

/** Tracks the cursor so `.spotlight` cards can draw a glow under it. */
export function spotlightHandler(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
}
