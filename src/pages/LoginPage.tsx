import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../api/apiClient';

export default function LoginPage() {
  const [email, setEmail] = useState('owner@example.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('fuelguard-token')) {
      navigate('/app');
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await post<{ user: { name: string }; token: string }>('/auth/login', { email, password });
      localStorage.setItem('fuelguard-token', res.token);
      localStorage.setItem('fuelguard-user', res.user.name);
      navigate('/app');
    } catch (err) {
      console.error(err);
      alert('Mock login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>FuelSensex Login</div>
        <div className="muted" style={{ marginBottom: '1.25rem' }}>
          Mock experience — any credentials will work.
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
