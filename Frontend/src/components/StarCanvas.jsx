import { useEffect, useRef } from 'react';

const StarCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let stars = [];
    let shootingStars = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = [];
      shootingStars = [];
      
      // Standard drifting stars
      for (let i = 0; i < 300; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          alpha: Math.random()
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw drifting stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, 2 * Math.PI);
        ctx.fill();

        // Parallax slow movement
        s.x += s.vx;
        s.y += s.vy;

        if (s.x < 0 || s.x > canvas.width) s.vx = -s.vx;
        if (s.y < 0 || s.y > canvas.height) s.vy = -s.vy;
        
        // Twinkle
        s.alpha += Math.random() * 0.05 - 0.025;
        if (s.alpha < 0.2) s.alpha = 0.2;
        if (s.alpha > 0.8) s.alpha = 0.8;
      }
      
      // Randomly spawn shooting stars
      if (Math.random() < 0.03 && shootingStars.length < 4) {
        shootingStars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height, // Spawn anywhere
          vx: (Math.random() < 0.5 ? 1 : -1) * (Math.random() * 5 + 10), // Fast horizontal, both directions
          vy: Math.random() * 5 + 5, // Fast vertical
          life: 1.0,
          length: Math.random() * 80 + 40
        });
      }

      // Draw and update shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        
        // Draw tail
        const gradient = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.length * (ss.vx/10), ss.y - ss.length * (ss.vy/10));
        gradient.addColorStop(0, `rgba(255, 255, 255, ${ss.life})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.length * (ss.vx/10), ss.y - ss.length * (ss.vy/10));
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Move shooting star
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= 0.008; // Fade slower so they travel further

        // Remove if faded or off screen
        if (ss.life <= 0 || ss.x > canvas.width || ss.y > canvas.height) {
          shootingStars.splice(i, 1);
        }
      }

      animationFrameId = window.requestAnimationFrame(draw);
    };

    init();
    draw();

    window.addEventListener('resize', init);
    
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', init);
    };
  }, []);

  return (
    <canvas 
      id="star-canvas" 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0, // Behind everything
        pointerEvents: 'none',
        background: 'transparent'
      }}
    />
  );
};

export default StarCanvas;
