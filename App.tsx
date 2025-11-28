import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Mic, 
  FileAudio, 
  Play, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  FileCode,
  Moon,
  Sun
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { AppStep, ClassificationResult, ModelMetadata } from './types';
import { classifyAudioWithGemini } from './services/geminiService';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD_MODEL);
  const [modelData, setModelData] = useState<ModelMetadata | null>(null);
  const [audioFile, setAudioFile] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | undefined>(undefined);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Toggle Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // --- Step 1: Model Upload ---
  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.ipynb')) {
        setError("Please upload a valid .ipynb file.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        setModelData({
          name: file.name,
          size: file.size,
          content: ev.target?.result as string
        });
        setError(null);
        setCurrentStep(AppStep.INPUT_AUDIO);
      };
      reader.readAsText(file);
    }
  };

  // --- Step 2: Audio Handling ---
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setError(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      setIsRecording(true);
      setAudioFile(null); // Clear previous file

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioFile(blob);
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(undefined);
      };

      mediaRecorder.start();
    } catch (err) {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- Step 3: Analysis ---
  const runClassification = async () => {
    if (!audioFile || !modelData) return;
    
    setCurrentStep(AppStep.ANALYZING);
    try {
      const data = await classifyAudioWithGemini(audioFile, modelData.content);
      setResult(data);
      setCurrentStep(AppStep.RESULTS);
    } catch (err) {
      setError("Classification failed. Please check your API key or internet connection.");
      setCurrentStep(AppStep.INPUT_AUDIO);
    }
  };

  const reset = () => {
    setAudioFile(null);
    setResult(null);
    setCurrentStep(AppStep.INPUT_AUDIO);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-8 flex flex-col items-center transition-colors duration-300">
      
      {/* Header */}
      <header className="w-full max-w-4xl mb-10 flex flex-col items-center text-center relative">
        <div className="absolute right-0 top-0">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-500">
            Urban Sound Classifier
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          Upload your custom ML Notebook model (.ipynb) and classify urban sounds with AI.
        </p>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl bg-white dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl dark:shadow-2xl transition-colors duration-300">
        
        {/* Progress Stepper */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10 -translate-y-1/2 rounded-full"></div>
          
          {[
            { icon: FileCode, label: "Model" },
            { icon: Mic, label: "Audio" },
            { icon: Activity, label: "Result" }
          ].map((step, idx) => {
            const isActive = currentStep >= idx;
            const isCompleted = currentStep > idx;
            return (
              <div key={idx} className="flex flex-col items-center bg-white dark:bg-slate-900 px-2 z-10 transition-colors duration-300">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                   isActive ? 'bg-cyan-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                } ${isCompleted ? 'bg-green-500' : ''}`}>
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* --- View: Upload Model --- */}
        {currentStep === AppStep.UPLOAD_MODEL && (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors bg-slate-50 dark:bg-slate-800/30">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 transition-colors">
              <Upload className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Upload Model Notebook</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm max-w-sm text-center">
              Select your Jupyter Notebook (.ipynb) containing the model architecture and weights references.
            </p>
            <label className="cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 px-6 rounded-lg transition-all shadow-lg hover:shadow-cyan-500/25">
              <span>Select .ipynb File</span>
              <input 
                type="file" 
                accept=".ipynb" 
                className="hidden" 
                onChange={handleModelUpload}
              />
            </label>
          </div>
        )}

        {/* --- View: Input Audio --- */}
        {(currentStep === AppStep.INPUT_AUDIO || currentStep === AppStep.ANALYZING) && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-slate-200">Model Loaded</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{modelData?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setModelData(null);
                  setCurrentStep(AppStep.UPLOAD_MODEL);
                  setAudioFile(null);
                }}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
              >
                Change
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Upload */}
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                <FileAudio className="w-10 h-10 text-purple-500 dark:text-purple-400 mb-3" />
                <h4 className="font-semibold mb-1 text-slate-800 dark:text-slate-100">Upload Audio</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">WAV, MP3, OGG supported</p>
                <label className="cursor-pointer w-full py-2 border border-purple-500/50 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-500/10 transition-colors text-sm">
                  Choose File
                  <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                </label>
              </div>

              {/* Option B: Record */}
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                <Mic className={`w-10 h-10 mb-3 ${isRecording ? 'text-red-500 animate-pulse' : 'text-cyan-600 dark:text-cyan-400'}`} />
                <h4 className="font-semibold mb-1 text-slate-800 dark:text-slate-100">Record Microphone</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{isRecording ? "Recording..." : "Click to start recording"}</p>
                
                {!isRecording ? (
                  <button 
                    onClick={startRecording}
                    className="w-full py-2 border border-cyan-500/50 text-cyan-600 dark:text-cyan-300 rounded hover:bg-cyan-500/10 transition-colors text-sm"
                  >
                    Start Recording
                  </button>
                ) : (
                  <button 
                    onClick={stopRecording}
                    className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-sm font-medium"
                  >
                    Stop Recording
                  </button>
                )}
              </div>
            </div>

            {/* Visualizer Area */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Audio Preview</h4>
              <Visualizer 
                stream={recordingStream} 
                audioFile={audioFile || undefined} 
                isRecording={isRecording} 
              />
              {audioFile && (
                <div className="flex justify-between text-xs text-cyan-600 dark:text-cyan-400 font-mono">
                   <span>Input Ready: {audioFile.type}</span>
                   <span>{(audioFile.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={runClassification}
              disabled={!audioFile || isRecording || currentStep === AppStep.ANALYZING}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                !audioFile || isRecording
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/20'
              }`}
            >
              {currentStep === AppStep.ANALYZING ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Processing Audio Model...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Classify Sound
                </>
              )}
            </button>
          </div>
        )}

        {/* --- View: Results --- */}
        {currentStep === AppStep.RESULTS && result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Top Result Banner */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-cyan-500/30">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Predicted Sound Class</p>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {result.label}
                </h2>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-4">
                <div className="text-right">
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Confidence</p>
                  <p className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-400">{result.accuracy}%</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                   <div 
                      className="absolute inset-0 rounded-full border-4 border-cyan-500" 
                      style={{ clipPath: `inset(${100 - result.accuracy}% 0 0 0)`}}
                   ></div>
                   <Activity className="w-6 h-6 text-slate-400 dark:text-slate-300" />
                </div>
              </div>
            </div>

            {/* Explanation & Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Chart - Fixed Container with Flex Column */}
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-[320px] flex flex-col">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-4 flex-shrink-0">Probability Distribution</h4>
                {/* Flex-grow wrapper with min-h-0 ensures ResponsiveContainer measures correctly */}
                <div className="flex-grow w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={result.probabilities} 
                      layout="vertical" 
                      margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#334155" : "#e2e8f0"} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={110} 
                        tick={{ fill: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: 12 }} 
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', 
                          borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', 
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a' 
                        }}
                        itemStyle={{ color: '#0891b2' }}
                        cursor={{fill: theme === 'dark' ? '#334155' : '#cbd5e1', opacity: 0.4}}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {result.probabilities.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : (theme === 'dark' ? '#64748b' : '#cbd5e1')} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Explanation Text */}
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-4">Model Analysis</h4>
                <div className="flex-grow text-slate-600 dark:text-slate-400 text-sm leading-relaxed overflow-y-auto max-h-[200px] pr-2 scrollbar-thin">
                  {result.explanation}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button 
                    onClick={reset}
                    className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Analyze Another Sample
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 text-slate-400 dark:text-slate-600 text-sm">
        <p>Powered by Google Gemini 2.5 Flash Native Audio & Vercel</p>
      </footer>
    </div>
  );
};

export default App;