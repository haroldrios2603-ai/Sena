import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const _navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // const response = await api.post('/auth/login', { email, password });
      // localStorage.setItem('token', response.data.accessToken);
      // navigate('/dashboard');
      console.log('Login attempt:', { email, password });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      <h1>Login - RM Parking</h1>
      <form onSubmit={handleSubmit}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
