import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/login.css';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await login(email, password);

      if (user.role === 'super_admin') {
        navigate('/admin');
      } else if (user.role === 'student') {
        navigate('/student');
      } else {
        navigate('/society');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err?.response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left marketing panel */}
      <div className="login-left">
        <div className="login-left-inner">
          <div className="login-logo">
            <div className="login-logo-icon">🎓</div>
            <span className="login-logo-text">EventSphere</span>
          </div>

          <h1 className="login-heading">
            University Event
            <br />
            Management System
          </h1>

          <p className="login-subtitle">
            Streamline your campus events, manage attendance, coordinate
            volunteers, and issue certificates&mdash;all in one powerful
            platform.
          </p>

          <ul className="login-bullets">
            <li>
              <span className="login-bullet-icon">✓</span>
              <span>Easy event registration &amp; attendance tracking</span>
            </li>
            <li>
              <span className="login-bullet-icon">✓</span>
              <span>Volunteer management &amp; coordination</span>
            </li>
            <li>
              <span className="login-bullet-icon">✓</span>
              <span>Automated certificate generation</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-right">
        <div className="login-right-inner">
          <div className="login-form-card">
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-text-muted">
              Sign in to your university account
            </p>

            <form
              onSubmit={handleSubmit}
              className="login-form"
              noValidate
            >
              <div className="login-field-group">
                <label className="login-label">Email Address</label>
                <input
                  className="input login-input"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="login-field-group">
                <label className="login-label">Password</label>
                <input
                  className="input login-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="login-row">
                <label className="login-remember">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="login-link-button"
                  onClick={() => {
                    // placeholder - you can later route to a forgot-password flow
                    alert('Contact admin to reset your password.');
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="button-primary login-submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="login-demo">
              <div className="login-demo-title">Demo Credentials:</div>
              <div className="login-demo-line">
                <span className="login-demo-label">Student:</span>{' '}
                <span>student@university.edu</span>
              </div>
              <div className="login-demo-line">
                <span className="login-demo-label">Society Admin:</span>{' '}
                <span>society@university.edu</span>
              </div>
              <div className="login-demo-line">
                <span className="login-demo-label">Super Admin:</span>{' '}
                <span>admin@university.edu</span>
              </div>
              <div className="login-demo-line">
                <span className="login-demo-label">Password:</span>{' '}
                <span>password123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
