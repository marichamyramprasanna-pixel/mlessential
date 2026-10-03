import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Trash2,
  Cpu,
  Layers,
  Shield,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { DBSCANResults } from "../../ml/dbscan";
import { CleanedDataset } from "../../ml/preprocessing";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model?: string;
  roleType?: string;
}

interface GeminiChatViewProps {
  results: DBSCANResults | null;
  dataset: CleanedDataset | null;
  datasetName: string | null;
}

export type BotRole = "analyst" | "telemetry_fast" | "threat_complex";

export const GeminiChatView: React.FC<GeminiChatViewProps> = ({
  results,
  dataset,
  datasetName,
}) => {
  const [selectedRole, setSelectedRole] = useState<BotRole>("analyst");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to the Network Anomaly Detection Assistant. How can I help you analyze flow telemetry, interpret DBSCAN density parameters, or evaluate detected traffic anomalies today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      model: "gemini-3.5-flash",
      roleType: "analyst",
    },
  ]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [attachContext, setAttachContext] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const rolesConfig: Record<
    BotRole,
    { title: string; taskType: "general" | "fast" | "complex"; modelName: string; badge: string; desc: string; icon: React.ReactNode }
  > = {
    analyst: {
      title: "Network Traffic Analyst",
      taskType: "general",
      modelName: "gemini-3.5-flash",
      badge: "General Tasks",
      desc: "Comprehensive density clustering analysis, noise point interpretation, and telemetry assessment.",
      icon: <Shield className="w-4 h-4 text-sky-400" />,
    },
    telemetry_fast: {
      title: "Rapid Telemetry Assistant",
      taskType: "fast",
      modelName: "gemini-3.1-flash-lite",
      badge: "Fast Mode",
      desc: "High-speed responses for metric definitions, packet formulas, and hyperparameter tuning.",
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
    threat_complex: {
      title: "Deep Threat Modeler",
      taskType: "complex",
      modelName: "gemini-3.1-pro-preview",
      badge: "Complex Reasoning",
      desc: "Multi-stage attack graph reasoning, APT profiling, and strategic mitigation engineering.",
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
    },
  };

  const currentRoleConfig = rolesConfig[selectedRole];

  // Build active telemetry context string
  const buildDetectionContextString = (): string | undefined => {
    if (!attachContext) return undefined;
    if (!results || !dataset) {
      if (datasetName) return `Dataset Ingested: ${datasetName} (Detection not yet executed).`;
      return undefined;
    }

    return `Dataset: ${datasetName || "Network Flows"}
Total Records: ${results.totalRecords}
Clusters Discovered: ${results.numClusters}
Noise Points (Potential Anomalies): ${results.numAnomalies} (${results.anomalyPercentage}%)
Parameters: eps=${results.eps}, min_samples=${results.minSamples}, metric=${results.metric}
Selected Features: ${dataset.featureNames.join(", ")}`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          role: selectedRole,
          taskType: currentRoleConfig.taskType,
          detectionContext: buildDetectionContextString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to receive AI response.");
      }

      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: "assistant",
        content: data.message.content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: data.message.model || currentRoleConfig.modelName,
        roleType: selectedRole,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error("Chat failure:", err);
      setError(err.message || "Failed to generate response.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: `Conversation cleared. I am ready in the ${currentRoleConfig.title} role (${currentRoleConfig.modelName}). What would you like to explore?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: currentRoleConfig.modelName,
        roleType: selectedRole,
      },
    ]);
    setError(null);
  };

  const suggestedQuestions: Record<BotRole, string[]> = {
    analyst: [
      "Why is DBSCAN better suited for network flow outliers than K-Means?",
      "How should I adjust epsilon if too much normal web traffic is flagged as noise?",
      "Can high packet rate flows be benign bursts or software updates?",
    ],
    telemetry_fast: [
      "Define Flow Bytes/s and how it is computed from flow duration.",
      "What is the mathematical definition of a DBSCAN core point?",
      "How does StandardScaler normalize variance across features?",
    ],
    threat_complex: [
      "Provide a MITRE ATT&CK technique mapping for abnormal outbound data exfiltration.",
      "How can an attacker craft asymmetrical SYN packet patterns to evade detection?",
      "Design a multi-layered defense architecture for high-velocity DDoS telemetry triage.",
    ],
  };

  return (
    <div className="space-y-4 max-w-5xl flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Top Configuration Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Gemini Security Chatbot
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-300 dark:border-slate-700 uppercase font-medium">
              Multi-Turn
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Interactive multi-turn technical assistant with specialized role-based system instructions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {results && (
            <label className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-2.5 py-1.5 rounded shadow-xs">
              <input
                type="checkbox"
                checked={attachContext}
                onChange={(e) => setAttachContext(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sky-600"
              />
              <span className="text-[11px] font-mono">Include Flow Context</span>
            </label>
          )}

          <button
            onClick={handleClearHistory}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
            title="Reset conversation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Role Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-shrink-0">
        {(["analyst", "telemetry_fast", "threat_complex"] as BotRole[]).map((r) => {
          const cfg = rolesConfig[r];
          const isSelected = selectedRole === r;
          return (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`p-2.5 rounded text-left border transition-colors flex items-start space-x-2.5 ${
                isSelected
                  ? "bg-sky-50 dark:bg-slate-800/90 border-sky-500 shadow-sm"
                  : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="mt-0.5">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold truncate ${isSelected ? "text-sky-700 dark:text-sky-300" : "text-slate-900 dark:text-slate-200"}`}>
                    {cfg.title}
                  </span>
                  <span className="text-[9px] font-mono uppercase px-1 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800">
                    {cfg.badge}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Model: {cfg.modelName}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center space-x-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scrollable Chat History Thread */}
      <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 rounded p-4 space-y-4 shadow-xs">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-xs border ${
                  isUser
                    ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    : "bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded p-3 text-xs leading-relaxed ${
                  isUser
                    ? "bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-slate-900 dark:text-slate-100"
                    : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-1 mb-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 gap-4">
                  <span>{isUser ? "Security Analyst" : currentRoleConfig.title}</span>
                  <div className="flex items-center space-x-2">
                    {m.model && <span className="text-sky-600 dark:text-sky-400 font-semibold">{m.model}</span>}
                    <span>{m.timestamp}</span>
                  </div>
                </div>

                <div className="whitespace-pre-line font-sans">{m.content}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 rounded bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
              <span className="font-mono text-[11px]">
                Generating reasoning using {currentRoleConfig.modelName}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mr-1">Suggested:</span>
        {suggestedQuestions[selectedRole].map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 transition-colors truncate max-w-xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded p-2 flex items-center space-x-2 flex-shrink-0 shadow-xs">
        <textarea
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={`Ask the ${currentRoleConfig.title} (${currentRoleConfig.modelName})...`}
          className="flex-1 bg-transparent border-0 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none font-sans"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || loading}
          className={`px-3 py-1.5 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors ${
            !inputText.trim() || loading
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700"
              : "bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
