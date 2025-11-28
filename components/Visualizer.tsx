import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

interface VisualizerProps {
  stream?: MediaStream;
  audioFile?: Blob;
  isRecording: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ stream, audioFile, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>();
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);

  // Drawing function
  const draw = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
      }

      // Use clearRect to support dynamic background colors (light/dark mode)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2; // Scale down

        // Gradient color: Cyan to Purple
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#06b6d4'); // Cyan 500
        gradient.addColorStop(1, '#a855f7'); // Purple 500
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    animate();
  }, []);

  // Initialize Audio Context and Source
  useEffect(() => {
    let audioUrl: string | null = null;
    let audioEl: HTMLAudioElement | null = null;
    let mounted = true;

    const initVisualizer = async () => {
      if (!canvasRef.current) return;
      
      // Safe cleanup of previous context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.warn("Error closing previous audio context:", e);
        }
      }
      
      if (!mounted) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      if (stream && isRecording) {
        // Microphone Source
        try {
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          setIsPlaying(true);
        } catch (err) {
          console.error("Error creating media stream source:", err);
        }
      } else if (audioFile && !isRecording) {
        // File Source (via Audio Element)
        if (audioElementRef.current) {
             audioElementRef.current.pause();
             audioElementRef.current.src = "";
        }

        audioUrl = URL.createObjectURL(audioFile);
        audioEl = new Audio(audioUrl);
        audioElementRef.current = audioEl;
        
        // Setup Event Listeners for Syncing State
        audioEl.onplay = () => { if (mounted) setIsPlaying(true); };
        audioEl.onpause = () => { if (mounted) setIsPlaying(false); };
        audioEl.onended = () => { if (mounted) setIsPlaying(false); };

        try {
          const source = audioCtx.createMediaElementSource(audioEl);
          source.connect(analyser);
          source.connect(audioCtx.destination); // Connect to speakers
        } catch (err) {
          console.error("Error creating element source:", err);
        }
      } else {
        setIsPlaying(false);
        // Clean up unused context immediately
        if (audioCtx.state !== 'closed') {
           audioCtx.close().catch(() => {});
        }
        return; 
      }

      if (mounted) draw();
    };

    initVisualizer();

    // Cleanup function
    return () => {
      mounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
         audioContextRef.current.close().catch(() => {});
      }

      if (audioEl) {
        audioEl.pause();
        audioEl.src = "";
        audioEl.onplay = null;
        audioEl.onpause = null;
        audioEl.onended = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [stream, audioFile, isRecording, draw]);

  const togglePlay = () => {
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play();
      }
    }
  };

  return (
    <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner relative group transition-colors duration-300">
       <canvas 
        ref={canvasRef} 
        width={600} 
        height={150} 
        className="w-full h-full"
      />
      
      {/* Overlay Play/Pause Button for File Playback */}
      {!isRecording && audioFile && (
        <div className={`absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/20 transition-opacity ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
          <button 
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg transition-transform hover:scale-105"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isRecording && !audioFile && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm pointer-events-none">
          Awaiting Audio Input...
        </div>
      )}

      {/* Recording Indicator Overlay */}
      {isRecording && (
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <span className="animate-pulse w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">Live</span>
        </div>
      )}
    </div>
  );
};

export default Visualizer;