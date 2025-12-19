import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TitleBar from './components/TitleBar';
import './App.css';

function App() {
  const [token, setToken] = useState<string | null>(null);

  const handleLoginSuccess = (token: string) => {
    setToken(token);
  };

  const handleLogout = () => {
    setToken(null);
  };

  return (
    <div className="h-screen bg-slate-950 text-white selection:bg-blue-500 selection:text-white pt-8 overflow-hidden">
      <TitleBar />
      {!token ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
