
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import { AppSettings, ViewType, UserBaseline } from './types';
import { generateId } from './utils';

import DottedGlowBackground from './components/DottedGlowBackground';
import SideDrawer from './components/SideDrawer';
import { 
    SparklesIcon, 
    ArrowUpIcon, 
    GridIcon 
} from './components/Icons';

const DEFAULT_SETTINGS: AppSettings = {
    behavioralProbe: true,
    authorityLevel: 'mentor',
    riskProfiling: true,
    thinkingBudget: 0,
    temperature: 0.7
};

const INITIAL_BASELINE: UserBaseline = {
    name: '',
    wakeTime: '07:00',
    sleepTime: '23:00',
    energyPeak: 'morning',
    primaryGoal: '',
    mainBlocker: '',
    workStyle: 'deep',
    authorityPreference: 'mentor'
};

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system-error';
    text: string;
    timestamp: number;
}

interface ChatInputProps {
    onSend: (text: string) => void;
    isLoading: boolean;
    onStop: () => void;
    errorMessage?: string | null;
    statusText?: string;
    cooldown: number;
}

const ChatInput = ({ onSend, isLoading, onStop, errorMessage, statusText, cooldown }: ChatInputProps) => {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!isLoading && !errorMessage && cooldown === 0) {
            inputRef.current?.focus();
        }
    }, [isLoading, errorMessage, cooldown]);

    const handleSend = () => {
        if (value.trim() && !isLoading && cooldown === 0) {
            onSend(value);
            setValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-input-container">
            {errorMessage && (
                <div className="chat-error-banner">
                    <span className="error-icon">⚠️</span>
                    {errorMessage}
                </div>
            )}
            {cooldown > 0 && (
                <div className="chat-cooldown-banner">
                    System Cooling: {cooldown}s remaining...
                </div>
            )}
            <div className={`chat-input-wrapper ${isLoading ? 'is-loading' : ''} ${errorMessage ? 'has-error' : ''} ${cooldown > 0 ? 'is-cooling' : ''}`}>
                {isLoading ? (
                    <div className="chat-loading-status">
                        <div className="loading-dots">
                            <span></span><span></span><span></span>
                        </div>
                        <span>{statusText || 'Sentinel Analyzing...'}</span>
                        <button className="chat-stop-button" onClick={onStop}>Stop</button>
                    </div>
                ) : (
                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={cooldown > 0 ? `Rate Limit Recovery...` : "Transmit intelligence..."}
                        rows={1}
                        disabled={cooldown > 0}
                    />
                )}
                <button 
                    className="chat-submit-button" 
                    onClick={handleSend} 
                    disabled={!value.trim() || isLoading || cooldown > 0}
                >
                    <ArrowUpIcon />
                </button>
            </div>
        </div>
    );
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('auth');
  const [settings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [baseline, setBaseline] = useState<UserBaseline | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [tempBaseline, setTempBaseline] = useState<UserBaseline>(INITIAL_BASELINE);
  
  // Auth state
  const [loginId, setLoginId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'settings' | null;
      title: string;
  }>({ isOpen: false, mode: null, title: '' });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const sessionAuth = localStorage.getItem('lifeax_auth');
    if (sessionAuth === 'true') {
        setIsAuthenticated(true);
        const savedBaseline = localStorage.getItem('sentinel_baseline');
        if (savedBaseline) {
            setBaseline(JSON.parse(savedBaseline));
            setActiveView('home');
        } else {
            setActiveView('onboarding');
        }
    }
  }, []);

  useEffect(() => {
    if (activeView === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, activeView]);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setInterval(() => {
        setCooldown(prev => {
            if (prev <= 1) {
                if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !accessCode) return;

    // Standard AI Studio API Key verification
    const aiWin = window as any;
    if (aiWin.aistudio && typeof aiWin.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await aiWin.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await aiWin.aistudio.openSelectKey();
        }
    }

    setIsAuthenticated(true);
    localStorage.setItem('lifeax_auth', 'true');
    const savedBaseline = localStorage.getItem('sentinel_baseline');
    if (savedBaseline) {
        setBaseline(JSON.parse(savedBaseline));
        setActiveView('home');
    } else {
        setActiveView('onboarding');
    }
  };

  const executeQuery = async (
    userText: string, 
    history: Message[], 
    onUpdate: (chunk: string) => void,
    attempt = 0
  ): Promise<void> => {
    const models = ['gemini-2.5-flash-lite-latest', 'gemini-3-flash-preview'];
    const currentModel = models[Math.min(attempt, models.length - 1)];
    setStatusText(attempt > 0 ? `Re-routing via ${currentModel}...` : 'Processing...');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const authorityText = baseline?.authorityPreference === 'mentor' ? "authoritative mentor" : "advisory guide";
        const baselineContext = baseline ? 
            `USER DOSSIER: Identity: ${baseline.name}, Focus: ${baseline.primaryGoal}, Constraint: ${baseline.mainBlocker}.` : 
            'USER DOSSIER: Initializing.';

        const contextWindow = history.slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));

        const responseStream = await ai.models.generateContentStream({
            model: currentModel,
            contents: contextWindow,
            config: { 
                systemInstruction: `You are Aura Sentinel. ${baselineContext} 
                PROTOCOL: 1. Act as a ${authorityText}. 2. Challenge the user's blockers aggressively but constructively. 3. Ask EXACTLY ONE sharp question. 4. Text only.`,
                temperature: settings.temperature,
            } 
        });

        setStatusText('');
        let fullText = '';
        for await (const chunk of responseStream) {
            if (abortControllerRef.current?.signal.aborted) return;
            fullText += (chunk as any).text || '';
            onUpdate(fullText);
        }
    } catch (error: any) {
        if (error.message?.includes("429") || error.message?.toLowerCase().includes("quota")) {
            startCooldown(15);
            setApiError("Global Traffic surge. System cooling (15s)...");
            throw error;
        }
        throw error;
    }
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (isLoading || cooldown > 0) return;
    setIsLoading(true);
    setApiError(null);
    const userMsgId = generateId();
    const assistantMsgId = generateId();
    abortControllerRef.current = new AbortController();

    const userMsg: Message = { id: userMsgId, role: 'user', text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setActiveView('chat');

    try {
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', text: '', timestamp: Date.now() }]);
        await executeQuery(text, newMessages, (content) => {
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: content } : m));
        });
        startCooldown(4);
    } catch (e: any) {
        console.error("Signal Lost:", e);
    } finally {
        setIsLoading(false);
        setStatusText('');
        abortControllerRef.current = null;
    }
  }, [isLoading, messages, settings, cooldown, startCooldown, baseline]);

  const finishOnboarding = () => {
    localStorage.setItem('sentinel_baseline', JSON.stringify(tempBaseline));
    setBaseline(tempBaseline);
    setActiveView('chat');
    handleSendMessage(`INITIALIZATION SYNC: Designation: ${tempBaseline.name}. Objective: ${tempBaseline.primaryGoal}. Constraint: ${tempBaseline.mainBlocker}. I am ready for behavioral analysis.`);
  };

  const onboardingSteps = [
    {
      title: "Designation",
      content: (
        <div className="onboarding-step">
          <label>Assign Identity</label>
          <input type="text" placeholder="Designation..." value={tempBaseline.name} onChange={e => setTempBaseline({...tempBaseline, name: e.target.value})} />
          <button className="onboarding-next" disabled={!tempBaseline.name} onClick={() => setOnboardingStep(1)}>Verify Identity</button>
        </div>
      )
    },
    {
      title: "Temporal Rhythm",
      content: (
        <div className="onboarding-step">
          <div className="input-row">
            <div><label>Wake</label><input type="time" value={tempBaseline.wakeTime} onChange={e => setTempBaseline({...tempBaseline, wakeTime: e.target.value})} /></div>
            <div><label>Sleep</label><input type="time" value={tempBaseline.sleepTime} onChange={e => setTempBaseline({...tempBaseline, sleepTime: e.target.value})} /></div>
          </div>
          <button className="onboarding-next" onClick={() => setOnboardingStep(2)}>Calibrate Rhythm</button>
        </div>
      )
    },
    {
      title: "Strategic Objectives",
      content: (
        <div className="onboarding-step">
          <label>90-Day Objective</label>
          <textarea placeholder="Define your mission..." value={tempBaseline.primaryGoal} onChange={e => setTempBaseline({...tempBaseline, primaryGoal: e.target.value})} />
          <label>Primary Friction Point</label>
          <input type="text" placeholder="Blocker..." value={tempBaseline.mainBlocker} onChange={e => setTempBaseline({...tempBaseline, mainBlocker: e.target.value})} />
          <button className="onboarding-next" disabled={!tempBaseline.primaryGoal || !tempBaseline.mainBlocker} onClick={() => setOnboardingStep(3)}>Synchronize Objectives</button>
        </div>
      )
    },
    {
      title: "Severity Level",
      content: (
        <div className="onboarding-step">
          <label>Select Authority Mode</label>
          <div className="mode-selector">
            <div className={`mode-card ${tempBaseline.authorityPreference === 'mentor' ? 'active' : ''}`} onClick={() => setTempBaseline({...tempBaseline, authorityPreference: 'mentor'})}>
                <h4>Mentor</h4><p>High accountability.</p>
            </div>
            <div className={`mode-card ${tempBaseline.authorityPreference === 'advisor' ? 'active' : ''}`} onClick={() => setTempBaseline({...tempBaseline, authorityPreference: 'advisor'})}>
                <h4>Advisor</h4><p>Collaborative guidance.</p>
            </div>
          </div>
          <button className="onboarding-next" onClick={finishOnboarding}>Engage Aura Sentinel</button>
        </div>
      )
    }
  ];

  return (
    <>
        <SideDrawer isOpen={drawerState.isOpen} onClose={() => setDrawerState(s => ({...s, isOpen: false}))} title={drawerState.title}>
            <div className="settings-panel">
                <div className="settings-section">
                    <h3>Dossier Record</h3>
                    {baseline ? (
                        <div className="baseline-summary">
                            <p><strong>Identity:</strong> {baseline.name}</p>
                            <p><strong>Objective:</strong> {baseline.primaryGoal}</p>
                            <p><strong>Constraint:</strong> {baseline.mainBlocker}</p>
                            <button className="reset-btn" onClick={() => { localStorage.clear(); window.location.reload(); }}>Purge All Records</button>
                        </div>
                    ) : <p>Calibration Incomplete.</p>}
                </div>
            </div>
        </SideDrawer>

        {isAuthenticated && (
            <nav className="main-nav">
                <div className="nav-brand" onClick={() => setActiveView('home')}>SENTINEL</div>
                <div className="nav-links">
                    <button className={activeView === 'home' ? 'active' : ''} onClick={() => setActiveView('home')}>Command</button>
                    <button className={activeView === 'chat' ? 'active' : ''} onClick={() => setActiveView('chat')}>Intelligence</button>
                    <button className={activeView === 'scheduler' ? 'active' : ''} onClick={() => setActiveView('scheduler')}>Scheduler</button>
                </div>
                <button className="settings-trigger-inline" onClick={() => setDrawerState({isOpen: true, mode: 'settings', title: 'System Arch'})}><GridIcon /></button>
            </nav>
        )}

        <div className="immersive-app">
            <DottedGlowBackground gap={24} speedScale={0.1} />

            {activeView === 'auth' && (
                <div className="auth-overlay">
                    <form className="auth-modal" onSubmit={handleAuth}>
                        <h1>LifeAx</h1>
                        <p>Aura Sentinel Build. Identity validation required.</p>
                        <div className="auth-inputs">
                            <input type="text" placeholder="Identity Handle" value={loginId} onChange={e => setLoginId(e.target.value)} required />
                            <input type="password" placeholder="Access Code" value={accessCode} onChange={e => setAccessCode(e.target.value)} required />
                        </div>
                        <button type="submit" className="auth-btn">Initialize Identity Core</button>
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="billing-link">Security & API Protocols</a>
                    </form>
                </div>
            )}

            {activeView === 'onboarding' && (
                <div className="onboarding-overlay">
                    <div className="onboarding-container">
                        <h2>{onboardingSteps[onboardingStep].title}</h2>
                        {onboardingSteps[onboardingStep].content}
                    </div>
                </div>
            )}

            {activeView === 'home' && (
                <div className="home-page scroll-content">
                    <div className="home-header"><h1>Aura Command</h1><p>Status: Synchronized with {baseline?.name}</p></div>
                    <div className="home-grid">
                        <div className="home-tile" onClick={() => setActiveView('chat')}>
                            <div className="tile-icon"><SparklesIcon /></div>
                            <h3>Intelligence</h3>
                            <p>Direct behavioral probe and diagnostic routine mapping.</p>
                        </div>
                        <div className="home-tile" onClick={() => setActiveView('scheduler')}>
                            <div className="tile-icon"><GridIcon /></div>
                            <h3>Scheduler</h3>
                            <p>Visual temporal mapping based on dossier maturity.</p>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'chat' && (
                <div className="chat-container">
                    <div className="chat-history">
                        {messages.length === 0 && <div className="chat-empty"><h2>Sentinel Intelligence</h2><p>Dossier Active. Transmit status report.</p></div>}
                        {messages.map(m => <div key={m.id} className={`chat-message ${m.role}`}><div className="message-content">{m.text}</div></div>)}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="chat-footer">
                        <ChatInput onSend={handleSendMessage} isLoading={isLoading} onStop={() => abortControllerRef.current?.abort()} errorMessage={apiError} statusText={statusText} cooldown={cooldown} />
                    </div>
                </div>
            )}

            {activeView === 'scheduler' && (
                <div className="scroll-content">
                    <div className="view-placeholder"><GridIcon /><h2>Temporal Scheduler</h2><p>Extracting behavioral patterns for visualization...</p><button className="init-btn" onClick={() => setActiveView('chat')}>Supply more context</button></div>
                </div>
            )}
        </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
