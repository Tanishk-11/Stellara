import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { authAPI } from '../services/api';

const LandingPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const res = await authAPI.login(email, password);
        localStorage.setItem('token', res.data.access_token);
        navigate('/dashboard');
      } else {
        await authAPI.register(name, email, password);
        // Auto-login after register
        const res = await authAPI.login(email, password);
        localStorage.setItem('token', res.data.access_token);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'Authentication failed.';
      if (err.response?.data?.detail) {
        errMsg = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      position: 'relative',
      backgroundImage: 'url(/blackhole.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* Top Header / Watermark Logo */}
      <header style={{ padding: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 10 }}>
        {/* Sleek S Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M75 25 L25 25 L25 50 L75 50 L75 75 L25 75" stroke="white" strokeWidth="6" fill="none" strokeLinejoin="miter" />
          </svg>
          <span style={{ 
            marginLeft: '15px', 
            fontSize: '24px', 
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            letterSpacing: '6px'
          }}>
            STELLARA
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'flex-end', 
        padding: '80px 40px',
        position: 'relative',
        zIndex: 5
      }}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ maxWidth: '800px' }}
        >
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', letterSpacing: '4px', marginBottom: '10px', color: '#aaaaaa' }}>
            STELLARA INTELLIGENCE
          </p>
          <h1 style={{ 
            fontSize: 'clamp(3rem, 6vw, 6rem)', 
            fontWeight: 700, 
            lineHeight: 1,
            marginBottom: '40px' 
          }}>
            UNLOCK THE <br/> UNIVERSE
          </h1>
          <button 
            className="btn uppercase" 
            onClick={() => setShowAuth(true)}
            style={{ width: '200px' }}
          >
            ENTER SYSTEM <ArrowRight size={16} style={{ marginLeft: '10px' }} />
          </button>
        </motion.div>
      </div>

      {/* Auth Panel Overlay */}
      <AnimatePresence>
        {showAuth && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 50,
              display: 'flex',
              justifyContent: 'flex-end'
            }}
            onClick={() => setShowAuth(false)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.4 }}
              style={{
                width: '100%',
                maxWidth: '500px',
                height: '100%',
                backgroundColor: 'var(--bg-panel)',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowAuth(false)}
                style={{ background: 'none', border: 'none', color: 'white', alignSelf: 'flex-end', cursor: 'pointer' }}
              >
                <X size={32} />
              </button>

              <div style={{ marginTop: '60px', flex: 1 }}>
                <h2 style={{ fontSize: '32px', marginBottom: '40px' }}>
                  {isLogin ? 'AUTHENTICATE' : 'REGISTER'}
                </h2>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {!isLogin && (
                    <input 
                      type="text" 
                      placeholder="FULL NAME" 
                      className="input-minimal"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required 
                    />
                  )}
                  <input 
                    type="email" 
                    placeholder="EMAIL ADDRESS" 
                    className="input-minimal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                  <input 
                    type="password" 
                    placeholder="PASSWORD" 
                    className="input-minimal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                  
                  {error && <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '-10px' }}>{error}</p>}
                  
                  <button type="submit" className="btn" disabled={loading} style={{ marginTop: '20px' }}>
                    {loading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'CREATE ACCOUNT')}
                  </button>

                  <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    {isLogin ? "DON'T HAVE AN ACCOUNT? " : "ALREADY HAVE AN ACCOUNT? "}
                    <span 
                      onClick={() => setIsLogin(!isLogin)} 
                      style={{ color: 'white', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {isLogin ? 'REGISTER' : 'LOGIN'}
                    </span>
                  </p>

                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;
