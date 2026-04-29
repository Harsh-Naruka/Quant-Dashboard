import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MODELS = {
  "SVM": { accuracy: 72.4, return: 8.3, sharpe: 0.71, maxDD: 14.2 },
  "Random Forest": { accuracy: 78.1, return: 11.7, sharpe: 0.89, maxDD: 12.6 },
  "LSTM": { accuracy: 83.6, return: 16.4, sharpe: 1.21, maxDD: 10.3 },
  "Transformer (BERT)": { accuracy: 87.2, return: 19.1, sharpe: 1.47, maxDD: 9.1 },
  "Hybrid CNN-LSTM": { accuracy: 89.5, return: 21.8, sharpe: 1.63, maxDD: 7.8 },
  "GPT-4 Fine-tuned": { accuracy: 92.3, return: 24.7, sharpe: 1.89, maxDD: 6.4 },
};

const BENCHMARK = { return: 20.6, sharpe: 1.12, maxDD: 18.5 };
const BASE_BPS = 5;
const STARTING_CAPITAL = 100000;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateEquityCurve(annualReturn, volatilityMult, seed) {
  const rand = seededRandom(seed);
  const monthlyReturn = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  const noise = 0.025 * volatilityMult;
  const points = [STARTING_CAPITAL];
  for (let i = 1; i <= 11; i++) {
    const prev = points[i - 1];
    const r = monthlyReturn + (rand() - 0.5) * noise * 2;
    points.push(prev * (1 + r));
  }
  const finalTarget = STARTING_CAPITAL * (1 + annualReturn / 100);
  points.push(finalTarget);
  return points;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f1419",
      border: "1px solid #1e3a2f",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 13,
    }}>
      <p style={{ color: "#64ffda", marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: ${Math.round(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [selectedModel, setSelectedModel] = useState("GPT-4 Fine-tuned");
  const [txCosts, setTxCosts] = useState(5);
  const [volMult, setVolMult] = useState(1.0);
  const [chartData, setChartData] = useState([]);

  const model = MODELS[selectedModel];
  const costPenalty = (txCosts - BASE_BPS) * 0.4;
  const adjReturn = +(model.return - costPenalty).toFixed(2);
  const adjSharpe = +(model.sharpe / volMult).toFixed(2);
  const adjMaxDD = +(model.maxDD * volMult).toFixed(2);

  const buildChart = useCallback(() => {
    const aiCurve = generateEquityCurve(adjReturn, volMult, 42);
    const bmCurve = generateEquityCurve(BENCHMARK.return, 1.0, 99);
    const data = MONTHS.map((m, i) => ({
      month: m,
      ai: Math.round(aiCurve[i + 1]),
      benchmark: Math.round(bmCurve[i + 1]),
    }));
    data.unshift({ month: "Start", ai: STARTING_CAPITAL, benchmark: STARTING_CAPITAL });
    setChartData(data);
  }, [adjReturn, volMult]);

  useEffect(() => { buildChart(); }, [buildChart]);

  const isPositive = adjReturn >= 0;

  const kpiCards = [
    {
      label: "Directional Accuracy",
      value: `${model.accuracy.toFixed(1)}%`,
      color: "#64ffda",
      sub: "Classification precision",
    },
    {
      label: "Annualized Return",
      value: `${adjReturn >= 0 ? "+" : ""}${adjReturn.toFixed(2)}%`,
      color: isPositive ? "#39ff14" : "#ff4444",
      sub: "After transaction costs",
    },
    {
      label: "Sharpe Ratio",
      value: adjSharpe.toFixed(2),
      color: adjSharpe >= 1 ? "#64ffda" : "#f5a623",
      sub: "Risk-adjusted return",
    },
    {
      label: "Max Drawdown",
      value: `-${adjMaxDD.toFixed(2)}%`,
      color: adjMaxDD > 15 ? "#ff4444" : adjMaxDD > 10 ? "#f5a623" : "#39ff14",
      sub: "Peak-to-trough loss",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a0e14 0%, #0d1a14 100%)",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      color: "#e2e8f0",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;600&family=Orbitron:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance: none; width: 100%; height: 4px; background: #1a3a2e; border-radius: 2px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #64ffda; cursor: pointer; box-shadow: 0 0 8px #64ffda88; }
        select { background: #0f1a14; color: #64ffda; border: 1px solid #1e4a38; padding: 8px 12px; border-radius: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; width: 100%; cursor: pointer; outline: none; }
        select:focus { border-color: #64ffda; }
        .scan-line { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.015) 2px, rgba(0,255,100,0.015) 4px); pointer-events: none; z-index: 0; }
        .card-glow:hover { box-shadow: 0 0 20px rgba(100,255,218,0.15); transition: box-shadow 0.3s; }
      `}</style>

      <div className="scan-line" />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid #1e3a2f",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,20,16,0.8)",
          backdropFilter: "blur(8px)",
        }}>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 20, fontWeight: 900, color: "#64ffda", letterSpacing: 2 }}>
              AI QUANT TRADING SIMULATOR
            </div>
            <div style={{ fontSize: 11, color: "#4a9a7a", marginTop: 4, letterSpacing: 1 }}>
              ACADEMIC RESEARCH PAPER FINDINGS · LIVE SIMULATION ENGINE
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#2a6a4a" }}>
              <span style={{ color: "#39ff14" }}>●</span> SYSTEM LIVE
            </div>
            <div style={{ fontSize: 11, color: "#4a9a7a" }}>
              BENCHMARK: +{BENCHMARK.return}% · SHARPE: {BENCHMARK.sharpe}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 0 }}>
          {/* Sidebar */}
          <div style={{
            width: 260,
            flexShrink: 0,
            borderRight: "1px solid #1e3a2f",
            padding: "24px 20px",
            background: "rgba(8,16,12,0.6)",
            minHeight: "calc(100vh - 73px)",
          }}>
            <div style={{ fontSize: 10, color: "#2a6a4a", letterSpacing: 2, marginBottom: 20, borderBottom: "1px solid #1a2e24", paddingBottom: 8 }}>
              ── CONTROL PANEL ──
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: "#64ffda", display: "block", marginBottom: 8, letterSpacing: 1 }}>
                AI MODEL SELECTION
              </label>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                {Object.keys(MODELS).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: "#64ffda", letterSpacing: 1 }}>TRANSACTION COSTS</label>
                <span style={{ fontSize: 13, color: "#39ff14", fontWeight: 600 }}>{txCosts} bps</span>
              </div>
              <input
                type="range" min={1} max={15} step={1}
                value={txCosts}
                onChange={e => setTxCosts(+e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#2a6a4a", marginTop: 4 }}>
                <span>1 bps</span><span>15 bps</span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: "#64ffda", letterSpacing: 1 }}>VOLATILITY MULT</label>
                <span style={{ fontSize: 13, color: "#f5a623", fontWeight: 600 }}>{volMult.toFixed(1)}x</span>
              </div>
              <input
                type="range" min={5} max={20} step={1}
                value={volMult * 10}
                onChange={e => setVolMult(+(e.target.value / 10).toFixed(1))}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#2a6a4a", marginTop: 4 }}>
                <span>0.5x Low</span><span>2.0x High</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #1a2e24", paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontSize: 10, color: "#2a6a4a", letterSpacing: 1, marginBottom: 12 }}>── MODEL REGISTRY ──</div>
              {Object.entries(MODELS).map(([name, m]) => (
                <div
                  key={name}
                  onClick={() => setSelectedModel(name)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    marginBottom: 4,
                    borderRadius: 4,
                    cursor: "pointer",
                    background: name === selectedModel ? "rgba(100,255,218,0.08)" : "transparent",
                    border: name === selectedModel ? "1px solid #1e4a38" : "1px solid transparent",
                    fontSize: 11,
                    color: name === selectedModel ? "#64ffda" : "#4a7a6a",
                    transition: "all 0.2s",
                  }}
                >
                  <span>{name}</span>
                  <span style={{ color: name === selectedModel ? "#39ff14" : "#2a4a3a" }}>{m.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, padding: "24px 28px" }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className="card-glow"
                  style={{
                    background: "rgba(10,20,16,0.8)",
                    border: `1px solid #1e3a2f`,
                    borderTop: `2px solid ${card.color}33`,
                    borderRadius: 8,
                    padding: "16px 18px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 0, right: 0, width: 60, height: 60,
                    background: `radial-gradient(circle, ${card.color}15, transparent 70%)`,
                    borderRadius: "0 8px 0 0",
                  }} />
                  <div style={{ fontSize: 10, color: "#4a7a6a", letterSpacing: 1.5, marginBottom: 10 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 600, color: card.color, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 10, color: "#2a5a4a", marginTop: 6 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Chart header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "#64ffda", letterSpacing: 1 }}>EQUITY CURVE SIMULATION</div>
                <div style={{ fontSize: 11, color: "#2a6a4a", marginTop: 2 }}>12-month portfolio growth · $100,000 base capital</div>
              </div>
              <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#64ffda" }}>
                  <span style={{ width: 24, height: 2, background: "#64ffda", display: "inline-block" }} />
                  {selectedModel}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#f5a623" }}>
                  <span style={{ width: 24, height: 2, background: "#f5a623", display: "inline-block", borderTop: "2px dashed #f5a623", marginTop: -2 }} />
                  Passive Benchmark
                </span>
              </div>
            </div>

            {/* Chart */}
            <div style={{
              background: "rgba(8,14,10,0.9)",
              border: "1px solid #1e3a2f",
              borderRadius: 8,
              padding: "20px 12px 16px 4px",
            }}>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2e24" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#4a7a6a", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                    axisLine={{ stroke: "#1e3a2f" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#4a7a6a", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="ai"
                    name={selectedModel}
                    stroke="#64ffda"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: "#64ffda", stroke: "#0a0e14", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark"
                    name="Passive Benchmark"
                    stroke="#f5a623"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4, fill: "#f5a623", stroke: "#0a0e14", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Footer stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginTop: 16,
            }}>
              {[
                { label: "Final AI Portfolio", value: `$${Math.round(STARTING_CAPITAL * (1 + adjReturn / 100)).toLocaleString()}`, col: isPositive ? "#39ff14" : "#ff4444" },
                { label: "Final Benchmark Portfolio", value: `$${Math.round(STARTING_CAPITAL * (1 + BENCHMARK.return / 100)).toLocaleString()}`, col: "#f5a623" },
                { label: "Alpha (vs Benchmark)", value: `${(adjReturn - BENCHMARK.return) >= 0 ? "+" : ""}${(adjReturn - BENCHMARK.return).toFixed(2)}%`, col: (adjReturn - BENCHMARK.return) >= 0 ? "#39ff14" : "#ff4444" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "rgba(10,20,16,0.6)",
                  border: "1px solid #1a3028",
                  borderRadius: 6,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                }}>
                  <span style={{ color: "#4a7a6a" }}>{s.label}</span>
                  <span style={{ color: s.col, fontWeight: 600, fontFamily: "'Orbitron', sans-serif", fontSize: 14 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
