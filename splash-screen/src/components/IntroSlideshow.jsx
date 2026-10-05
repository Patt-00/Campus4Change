import './IntroSlideshow.css';
import slides from '../data/slides.js';
import IntroSlide from './IntroSlide.jsx';
import PageDots from './PageDots.jsx';
import PrimaryButton from './PrimaryButton.jsx';

function IntroSlideshow({ index, onSelect, onFinish }) {
  const isLast = index === slides.length - 1;

  const handleNext = () => (isLast ? onFinish() : onSelect(index + 1));

  return (
    <main className="intro" aria-label="Campus4Change introduction">
      <div className="intro-topbar">
        <button className="text-button" disabled={index === 0} onClick={() => onSelect(index - 1)}>← Back</button>
        <span className="intro-step">{index + 1} / {slides.length}</span>
      </div>
      <IntroSlide key={index} slide={slides[index]} />
      <div className="intro-controls">
        <PageDots total={slides.length} active={index} onSelect={onSelect} />
        <PrimaryButton onClick={handleNext}>{isLast ? 'Get started' : 'Next'}</PrimaryButton>
        <button
          type="button"
          className={isLast ? 'skip skip--hidden' : 'skip'}
          onClick={onFinish}
        >
          Skip
        </button>
      </div>
    </main>
  );
}

export default IntroSlideshow;
