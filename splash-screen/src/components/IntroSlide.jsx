function IntroSlide({ slide }) {
  return (
    <section className="slide" style={{ '--accent': slide.accent }}>
      <div className="slide-art">
        <img src={slide.image} alt="" />
      </div>
      <span className="slide-tag">{slide.level}</span>
      <h2>{slide.title}</h2>
      <p>{slide.text}</p>
    </section>
  );
}

export default IntroSlide;
