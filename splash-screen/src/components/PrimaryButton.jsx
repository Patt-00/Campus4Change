import './PrimaryButton.css';

function PrimaryButton({ children, onClick, type = 'button' }) {
  return (
    <button type={type} className="primary-btn" onClick={onClick}>
      {children}
    </button>
  );
}

export default PrimaryButton;
