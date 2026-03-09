import React, { useEffect, useRef, useState } from 'react';

interface WeatherInfo {
  temp: number;
  code: number;
  label: string;
  isDay: boolean;
  city: string;
}

const WEATHER_MAP: Record<number, string> = {
  0: 'CLEAR',
  1: 'PARTLY CLOUDY', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
  45: 'FOGGY', 48: 'FOGGY',
  51: 'DRIZZLE', 53: 'DRIZZLE', 55: 'DRIZZLE',
  61: 'RAIN', 63: 'RAIN', 65: 'RAIN',
  71: 'SNOW', 73: 'SNOW', 75: 'SNOW',
  80: 'SHOWERS', 81: 'SHOWERS', 82: 'SHOWERS',
};

const HOUSE_ASCII = [
  "        (  )   ",
  "         ( )   ",
  "        _||_   ",
  "      _/    \\_ ",
  "     /        \\",
  "    /          \\",
  "   |   __  __   |",
  "   |  |  ||  |  |",
  "   |  |__||__|  |",
  "   |   __  __   |",
  "   |  |  ||  |  |",
  "   |  |__||__|  |",
  "   |            |",
  "   |_____[  ]___|"
];

const TREE_ASCII = [
  "    {%%}",
  "   {%%%%}",
  "  {%%%%%%}",
  "    |  |",
  "    |  |"
];

export const WeatherBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [testMode, setTestMode] = useState(false);
  
  // Particle systems
  const smokeParticles = useRef<any[]>([]);
  const weatherParticles = useRef<any[]>([]);
  const clouds = useRef<any[]>([]);
  const stars = useRef<any[]>([]);

  const cycleWeather = () => {
    setTestMode(true);
    const states: WeatherInfo[] = [
      { temp: 25, code: 0, label: 'CLEAR (DAY)', isDay: true, city: 'SIMULATOR' },
      { temp: 18, code: 61, label: 'HEAVY RAIN', isDay: true, city: 'SIMULATOR' },
      { temp: -5, code: 71, label: 'SNOWFALL', isDay: true, city: 'SIMULATOR' },
      { temp: 12, code: 0, label: 'CLEAR (NIGHT)', isDay: false, city: 'SIMULATOR' },
    ];
    
    setWeather(prev => {
      const currentIndex = states.findIndex(s => s.label === prev?.label);
      return states[(currentIndex + 1) % states.length];
    });
  };

  useEffect(() => {
    const fetchWeather = async () => {
      const fallback: WeatherInfo = { temp: 20, code: 0, label: 'CLEAR', isDay: true, city: 'DEFAULT' };
      if (!navigator.geolocation) {
        setWeather(fallback);
        return;
      }
      try {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`);
            const data = await res.json();
            const code = data.current.weather_code;
            setWeather({
              temp: Math.round(data.current.temperature_2m),
              code: code,
              label: WEATHER_MAP[code] || 'UNKNOWN',
              isDay: data.current.is_day === 1,
              city: 'CURRENT LOCATION'
            });
          } catch (e) {
            setWeather(fallback);
          }
        }, () => setWeather(fallback));
      } catch (e) {
        setWeather(fallback);
      }
    };
    fetchWeather();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initEnvironment();
    };

    const initEnvironment = () => {
      // Init Stars
      stars.current = [];
      if (weather && !weather.isDay) {
        for (let i = 0; i < 50; i++) {
          stars.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            char: Math.random() > 0.5 ? '.' : '+'
          });
        }
      }

      // Init Clouds
      clouds.current = [];
      for (let i = 0; i < 5; i++) {
        clouds.current.push({
          x: Math.random() * canvas.width,
          y: 50 + Math.random() * 150,
          speed: 0.2 + Math.random() * 0.3,
          text: "(####)"
        });
      }

      // Init Weather Particles
      weatherParticles.current = [];
      const count = 80;
      for (let i = 0; i < count; i++) {
        weatherParticles.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 5 + Math.random() * 10,
          vx: 2,
          offset: Math.random() * 1000
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Check if click is near the status bar area
      const barY = canvas.height - 20;
      if (e.clientY > barY - 50) {
        cycleWeather();
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('click', handleClick);
    resize();

    let animationFrame: number;
    const render = () => {
      // 15% Frame retention for smoother trails
      ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = '12px monospace';
      ctx.fillStyle = '#00ff41';
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(0, 255, 65, 0.6)';

      const code = weather?.code ?? 0;
      const time = Date.now() / 1000;

      // Draw Stars with Twinkle
      if (weather && !weather.isDay) {
        stars.current.forEach((s, i) => {
          const twinkle = 0.3 + Math.abs(Math.sin(time + i)) * 0.7;
          ctx.save();
          ctx.globalAlpha = twinkle;
          ctx.fillText(s.char, s.x, s.y);
          ctx.restore();
        });
      }

      // Draw Ground Line
      const groundY = canvas.height - 40;
      ctx.globalAlpha = 0.3;
      ctx.fillText("_".repeat(Math.floor(canvas.width / 7)), 0, groundY);
      ctx.globalAlpha = 1;

      // Draw Clouds
      clouds.current.forEach(c => {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillText(c.text, c.x, c.y);
        ctx.restore();
        c.x += c.speed;
        if (c.x > canvas.width) c.x = -100;
      });

      // Draw Weather Particles
      weatherParticles.current.forEach(p => {
        // Rain (51-67, 80-82)
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
          ctx.fillText('/', p.x, p.y);
          p.y += p.speed;
          p.x += 1.5;
          if (p.y > groundY) { 
            // Splash effect
            ctx.fillText('v', p.x, groundY);
            p.y = -20; 
            p.x = Math.random() * canvas.width; 
          }
        } 
        // Snow (71-77, 85-86)
        else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
          ctx.fillText('*', p.x, p.y);
          p.y += p.speed * 0.15;
          p.x += Math.sin(time + p.offset) * 1.2;
          if (p.y > groundY) { p.y = -20; p.x = Math.random() * canvas.width; }
        }
      });

      // Draw House & Tree
      const houseX = canvas.width - 250; // Move to the right
      const treeX = 150; // Move to the left
      const houseY = groundY - 196; 
      
      // Tree
      TREE_ASCII.forEach((line, i) => {
        ctx.save();
        ctx.fillStyle = '#008822';
        ctx.fillText(line, treeX, groundY - 70 + i * 14);
        ctx.restore();
      });

      // House
      HOUSE_ASCII.forEach((line, i) => {
        ctx.fillText(line, houseX, houseY + i * 14);
      });

      // Enhanced Chimney Smoke
      if (Math.random() > 0.7) {
        smokeParticles.current.push({
          x: houseX + 85, // Aligned with chimney
          y: houseY + 30,
          size: 8,
          alpha: 0.8,
          vx: (Math.random() - 0.1) * 0.8,
          vy: -0.8 - Math.random() * 1.2,
          char: ['~', 'o', 'O', '@', '°'][Math.floor(Math.random() * 5)]
        });
      }

      smokeParticles.current = smokeParticles.current.filter(p => p.alpha > 0);
      smokeParticles.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.font = `${p.size}px monospace`;
        ctx.fillText(p.char, p.x, p.y);
        ctx.restore();

        p.x += p.vx + Math.sin(time * 2 + p.y / 50) * 0.5;
        p.y += p.vy;
        p.size += 0.15;
        p.alpha -= 0.004;
      });

      // Draw Status Bar
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      const barY = canvas.height - 20;
      const barWidth = Math.floor(canvas.width / 8);
      
      const statusLine = `┌${"─".repeat(barWidth - 4)}┐`;
      const statusContent = `│ [ CITY: ${weather?.city || 'DETECTING...'} ] [ TEMP: ${weather?.temp ?? '--'}°C ] [ STATUS: ${weather?.label || 'SYNCING'} ] [ CLICK TO TEST ] │`;
      const statusBottom = `└${"─".repeat(barWidth - 4)}┘`;

      ctx.fillText(statusLine, 10, barY - 30);
      ctx.fillText(statusContent, 10, barY - 15);
      ctx.fillText(statusBottom, 10, barY);

      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrame);
    };
  }, [weather]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full pointer-events-auto cursor-pointer" />
      <div className="crt-overlay" />
    </div>
  );
};
