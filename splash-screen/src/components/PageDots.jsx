function PageDots({ total, active, onSelect }) {
  return (
    <nav className="dots" aria-label="Introduction slides">
      {Array.from({ length: total }, (_, i) => (
        <button key={i} type="button" className="dot-button" onClick={() => onSelect(i)} aria-label={`Go to introduction ${i + 1}`} aria-current={i === active ? 'step' : undefined}>
          <span className={i === active ? 'dot dot--active' : 'dot'} />
        </button>
      ))}
    </nav>
  );
}

export default PageDots;
