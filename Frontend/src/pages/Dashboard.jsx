import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, MessageSquare, Camera, Crown, Send, Loader2, FlipHorizontal, Focus, UploadCloud } from 'lucide-react';
import { chatAPI, visionAPI, paymentAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const navigate = useNavigate();
  
  // Chat State
  const [messages, setMessages] = useState([{ role: 'agent', content: 'SYSTEM INITIALIZED. STARGAZER AI ONLINE. HOW CAN I ASSIST YOUR EXPLORATION?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Vision State
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [visionResult, setVisionResult] = useState(null);
  const [visionLoading, setVisionLoading] = useState(false);
  
  // Camera State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' is back camera, 'user' is front
  const [cameraActive, setCameraActive] = useState(false);
  
  // Upgrade State
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Camera Management
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported or not secure");
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode }
        });
      } catch (err) {
        // Fallback to any available camera if facingMode constraint fails (e.g., on desktop)
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      // Check if videoRef is currently mounted before assigning
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      } else {
        // If unmounted while waiting for stream, stop tracks immediately
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      // Don't alert aggressively, just leave it in the initializing/fallback state
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'vision') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, startCamera, stopCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setVisionLoading(true);
    setVisionResult(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw current video frame to canvas
    if (facingMode === 'user') {
      // Flip horizontally if using front camera so it acts like a mirror
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Get location synchronously within the user gesture to prevent browser blocking
      const { lat, lon } = await getUserLocation();
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setVisionLoading(false);
          return;
        }
        // Send blob to API directly
        try {
          const res = await visionAPI.detectConstellation(blob, lat, lon);
          setVisionResult(res.data.predictions);
        } catch (err) {
          setVisionResult("ERROR ANALYZING TELEMETRY DATA.");
        } finally {
          setVisionLoading(false);
        }
      }, 'image/jpeg', 0.9);
      
    } catch (err) {
      setVisionResult("LOCATION SERVICES REQUIRED. PLEASE ALLOW LOCATION ACCESS.");
      setVisionLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setVisionResult(null);
    }
  };

  const getUserLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lon: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
        (error) => resolve({ lat: null, lon: null })
      );
    });
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;
    setVisionLoading(true);
    
    try {
      const { lat, lon } = await getUserLocation();
      const res = await visionAPI.detectConstellation(selectedImage, lat, lon);
      setVisionResult(res.data.predictions);
    } catch (err) {
      setVisionResult("ERROR ANALYZING TELEMETRY DATA.");
    } finally {
      setVisionLoading(false);
    }
  };

  // Chat Actions
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { lat, lon } = await getUserLocation();
      const res = await chatAPI.sendMessage(userMsg, lat, lon);
      setMessages(prev => [...prev, { role: 'agent', content: res.data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'agent', content: 'SYSTEM ERROR: CONNECTION TO STARGAZER LOST.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const { data: order } = await paymentAPI.createOrder();
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "STELLARA PREMIUM",
        description: "UNLOCK ADVANCED TELEMETRY",
        order_id: order.order_id,
        handler: async function (response) {
          try {
            await paymentAPI.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            alert("UPGRADE SUCCESSFUL. WELCOME TO THE FLEET.");
          } catch (err) {
            alert("PAYMENT VERIFICATION FAILED.");
          }
        },
        theme: { color: "#ffffff" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert("SYSTEM ERROR INITIATING SECURE COMMS.");
    } finally {
      setUpgrading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      background: 'transparent',
      position: 'relative' // relative so StarCanvas is behind
    }}>
      
      {/* Top Navigation */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="header-container"
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M75 25 L25 25 L25 50 L75 50 L75 75 L25 75" stroke="white" strokeWidth="8" fill="none" strokeLinejoin="miter" />
          </svg>
          <span style={{ 
            marginLeft: '15px', 
            fontSize: '18px', 
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            letterSpacing: '4px'
          }}>
            STELLARA COMMAND
          </span>
        </div>

        <div className="header-buttons">
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: '0px 0px 15px rgba(255,255,255,0.5)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUpgrade} 
            className="btn" 
            disabled={upgrading}
          >
            {upgrading ? 'UPLINKING...' : 'UPGRADE TO PREMIUM'}
          </motion.button>
          <button onClick={handleLogout} className="btn btn-sidebar">
            LOGOUT
          </button>
        </div>
      </motion.header>

      {/* Main Layout */}
      <div className="main-layout">
        
        {/* Sidebar */}
        <motion.div 
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="sidebar"
        >
          <motion.button 
            variants={itemVariants}
            className={`btn btn-sidebar`}
            onClick={() => setActiveTab('chat')}
            style={{ 
              width: '100%', 
              justifyContent: 'flex-start',
              borderLeft: activeTab === 'chat' ? '3px solid white' : '3px solid transparent',
              background: activeTab === 'chat' ? 'rgba(255,255,255,0.1)' : 'transparent',
              opacity: activeTab === 'chat' ? 1 : 0.6,
              borderRadius: '8px',
              transition: 'all 0.3s'
            }}
          >
            <MessageSquare size={16} style={{ marginRight: '15px' }} /> STARGAZER AI
          </motion.button>
          
          <motion.button 
            variants={itemVariants}
            className={`btn btn-sidebar`}
            onClick={() => setActiveTab('vision')}
            style={{ 
              width: '100%', 
              justifyContent: 'flex-start',
              borderLeft: activeTab === 'vision' ? '3px solid white' : '3px solid transparent',
              background: activeTab === 'vision' ? 'rgba(255,255,255,0.1)' : 'transparent',
              opacity: activeTab === 'vision' ? 1 : 0.6,
              borderRadius: '8px',
              transition: 'all 0.3s'
            }}
          >
            <Camera size={16} style={{ marginRight: '15px' }} /> CONSTELLATION TRACKER
          </motion.button>
        </motion.div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
                <div className="chat-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <AnimatePresence>
                    {messages.map((m, i) => (
                      <motion.div 
                        key={i} 
                        variants={messageVariants}
                        initial="hidden"
                        animate="show"
                        style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
                      >
                        <div className="message-bubble" style={{ 
                          padding: '20px', 
                          backgroundColor: m.role === 'user' ? '#ffffff' : 'rgba(20,20,20,0.8)',
                          color: m.role === 'user' ? '#000000' : '#ffffff',
                          border: m.role === 'agent' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                          fontFamily: 'var(--font-body)',
                          fontSize: '15px',
                          lineHeight: '1.6',
                          borderRadius: '8px',
                          backdropFilter: m.role === 'agent' ? 'blur(10px)' : 'none'
                        }}>
                          {m.role === 'agent' && <div style={{ fontSize: '12px', color: '#aaaaaa', marginBottom: '8px', letterSpacing: '2px' }}>STARGAZER UPLINK</div>}
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {chatLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ display: 'flex', justifyContent: 'flex-start' }}
                    >
                      <div style={{ padding: '20px', backgroundColor: 'rgba(20,20,20,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <Loader2 className="lucide-spin" size={20} color="white" />
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <form onSubmit={handleSendMessage} style={{ padding: '30px 40px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '20px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
                  <input 
                    type="text" 
                    className="input-minimal" 
                    style={{ flex: 1, borderBottom: '1px solid rgba(255,255,255,0.3)' }}
                    placeholder="TRANSMIT MESSAGE TO STARGAZER..." 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    type="submit" className="btn" disabled={chatLoading || !chatInput.trim()}
                  >
                    TRANSMIT
                  </motion.button>
                </form>
              </motion.div>
          )}

          {activeTab === 'vision' && (
            <motion.div 
              key="vision"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="vision-container"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100%', overflowY: 'auto' }}
            >
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ fontSize: '32px', marginBottom: '10px' }}>CONSTELLATION TRACKER</h3>
                  <p style={{ color: 'var(--text-muted)', letterSpacing: '1px' }}>LIVE SENSOR FEED ACTIVATED. CAPTURE IMAGERY OR UPLOAD FILE FOR AI ANALYSIS.</p>
                </div>
                
                {/* Live Camera View */}
                <div style={{ 
                  width: '100%', maxWidth: '800px', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: '#000',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '12px',
                  aspectRatio: '16/9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <video 
                        ref={videoRef}
                        autoPlay 
                        playsInline 
                        muted
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                        }} 
                      />
                      {!cameraActive && (
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', opacity: 0.7 }}>
                          <Loader2 className="lucide-spin" size={40} style={{ marginBottom: '15px' }} />
                          <p style={{ letterSpacing: '2px', fontSize: '14px' }}>INITIALIZING SENSORS...</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Camera Controls Overlay */}
                  {!previewUrl && (
                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', gap: '15px' }}>
                      <motion.button 
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={toggleCamera}
                        style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.3)', padding: '15px', color: 'white', cursor: 'pointer', borderRadius: '50%' }}
                        title="Flip Camera"
                      >
                        <FlipHorizontal size={24} />
                      </motion.button>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                  {!previewUrl ? (
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: '0px 0px 20px rgba(255,255,255,0.3)' }} whileTap={{ scale: 0.95 }}
                      className="btn" 
                      style={{ padding: '15px 40px', display: 'flex', alignItems: 'center', gap: '10px' }} 
                      onClick={handleCapture} 
                      disabled={visionLoading || !cameraActive}
                    >
                      {visionLoading ? <Loader2 className="lucide-spin" size={18} /> : <Focus size={18} />}
                      {visionLoading ? 'ANALYZING...' : 'CAPTURE & ANALYZE'}
                    </motion.button>
                  ) : (
                    <motion.button 
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="btn" 
                      style={{ padding: '15px 40px', display: 'flex', alignItems: 'center', gap: '10px' }} 
                      onClick={handleAnalyzeImage} 
                      disabled={visionLoading}
                    >
                      {visionLoading ? <Loader2 className="lucide-spin" size={18} /> : <Focus size={18} />}
                      {visionLoading ? 'ANALYZING...' : 'ANALYZE UPLOADED IMAGE'}
                    </motion.button>
                  )}
                  
                  <span style={{ color: 'var(--text-muted)' }}>OR</span>
                  
                  <label>
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => {
                      stopCamera();
                      handleImageChange(e);
                    }} />
                    <motion.div 
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="btn btn-sidebar"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px 30px', border: '1px dashed rgba(255,255,255,0.3) !important', cursor: 'pointer' }}
                    >
                      <UploadCloud size={18} /> UPLOAD FILE
                    </motion.div>
                  </label>
                  
                  {previewUrl && (
                    <motion.button 
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="btn btn-sidebar" 
                      onClick={() => { setPreviewUrl(null); setSelectedImage(null); setVisionResult(null); startCamera(); }}
                      style={{ padding: '15px 30px' }}
                    >
                      CLEAR & RETURN TO SENSOR
                    </motion.button>
                  )}
                </div>

                {visionResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'rgba(20,20,20,0.8)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)', padding: '30px', marginTop: '40px', width: '100%', maxWidth: '800px', backdropFilter: 'blur(10px)' }}
                  >
                    <h4 style={{ color: '#aaa', marginBottom: '15px', fontSize: '12px', letterSpacing: '2px' }}>ANALYSIS RESULTS</h4>
                    <div style={{ fontSize: '16px', lineHeight: '1.6' }}>
                      {visionResult.error ? (
                        <p style={{ color: '#f87171' }}><strong>Error:</strong> {visionResult.error}</p>
                      ) : typeof visionResult === 'object' ? (
                        <div style={{ display: 'grid', gap: '10px' }}>
                          {Object.entries(visionResult).map(([constellation, score]) => (
                            <div key={constellation} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
                              <span style={{ fontWeight: 'bold' }}>{constellation}</span>
                              <span style={{ color: score > 50 ? '#4ade80' : '#f87171' }}>{Number(score).toFixed(2)}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="markdown-body" style={{ color: '#e0e0e0' }}>
                          <ReactMarkdown>{visionResult}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Hidden canvas for taking snapshot */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </motion.div>
          )}

        </div>
      </div>

    </div>
  );
};

export default Dashboard;
