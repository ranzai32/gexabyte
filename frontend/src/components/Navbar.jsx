import './Navbar.css';
import { Link } from 'react-router-dom';
function Navbar({ userAddress, connectWallet, navbarErrorMessage }) {
    return (
        <nav className="navbar">
            <div className="navbar-left-section">
                <Link to="/" className="navbar-brand">RocketSwap</Link>
                <div className="navbar-links">
                    <Link to="/trade">Trade</Link>  
                    <Link to="/earn">Earn</Link>  
                </div>
            </div>
            <div className="navbar-wallet">
                {userAddress ? (
                    <div className="wallet-info">
                        <p>Address: {`${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`}</p>
                    </div>
                ) : (
                    <button onClick={connectWallet} className="connect-wallet-btn">
                        Connect Wallet
                    </button>
                )}
                {navbarErrorMessage && <p className="error-message">{navbarErrorMessage}</p>}
            </div>
        </nav>
    );
}
export default Navbar;