import './SplashScreen.css';
import logo from '../assets/campus4change-logo.png';

function SplashScreen() {
  return (
    <main className="splash" aria-labelledby="splash-title">
      <div className="splash-content">
        <img className="splash-logo" src={logo} alt="Campus4Change: students learning together" />
        <h1 id="splash-title" className="sr-only">Campus4Change</h1>
        <p className="splash-tagline">Learn together. Grow together.</p>
        <p className="splash-caption">Change your campus.</p>
        <div className="splash-bar" role="progressbar" aria-label="Opening Campus4Change">
          <span />
        </div>
      </div>
      <p className="splash-footer">Find help. Share knowledge. Make an impact.</p>
    </main>
  );
}

export default SplashScreen;
