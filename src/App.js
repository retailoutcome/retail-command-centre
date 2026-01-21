import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Table, 
  CheckSquare, 
  Settings, 
  Plus, 
  Save, 
  Search,
  Filter,
  Download,
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Calculator,
  ListTodo,
  MessageSquare,
  Send,
  HeartHandshake,
  Store,
  UploadCloud,
  Megaphone,
  Mail,
  Eye,
  CalendarRange,
  Package
} from 'lucide-react';

// --- Gemini API Setup ---
const apiKey = typeof process !== 'undefined' && process.env && process.env.REACT_APP_GEMINI_API_KEY 
  ? process.env.REACT_APP_GEMINI_API_KEY 
  : "";

const callGemini = async (prompt, contextData, systemInstructionOverride = null) => {
  const defaultSystemPrompt = `You are Keith J Lockwood, author of 'The Reluctant Retailer'. 
  You are a supportive mentor to independent shopkeepers in the UK.
  
  **CRITICAL INSTRUCTIONS:**
  1. **Language:** ALWAYS use British English spelling (e.g., colour, behaviour, organise, centre, programme).
  2. **Formatting:** - Use **Markdown Tables** for ANY data comparisons or lists of figures. Ensure columns are separated by pipes (|).
     - Use **double asterisks** to bold key metrics and headings.
     - Use standard bullet points for lists.
  3. **Tone:** Warm, encouraging, plain English, and jargon-free.
  
  Context Data provided: ${JSON.stringify(contextData)}
  
  Provide a friendly, actionable response.`;
  
  const finalSystemPrompt = systemInstructionOverride || defaultSystemPrompt;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: finalSystemPrompt }] }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const data = await response.json();
    
    if (!response.ok) {
         console.error("Gemini API Error:", data);
         return "I'm having a spot of bother connecting to my brain right now. Please check your API Key settings in Vercel.";
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having a spot of bother thinking right now. Ask me again in a moment.";
  } catch (error) {
    console.error("Network Error:", error);
    return "I'm having trouble connecting. Please check your internet.";
  }
};

// --- Mock Initial Data ---
const INITIAL_INVENTORY = [
  { id: 1, name: 'Ceramic Vase - Blue', category: 'Homeware', supplier: 'Acme Ceramics', cost: 8.50, rrp: 24.00, stock: 45, sales_last_month: 4, sales_hist: 120 },
  { id: 2, name: 'Scented Candle - Fig', category: 'Gifts', supplier: 'Wax Works', cost: 3.50, rrp: 12.00, stock: 12, sales_last_month: 48, sales_hist: 500 },
  { id: 3, name: 'Linen Shirt - White', category: 'Clothing', supplier: 'Natural Fibres', cost: 15.00, rrp: 45.00, stock: 8, sales_last_month: 15, sales_hist: 200 },
  { id: 4, name: 'Oak Picture Frame', category: 'Homeware', supplier: 'Frame It', cost: 6.00, rrp: 18.00, stock: 60, sales_last_month: 2, sales_hist: 50 },
  { id: 5, name: 'Greeting Card - Bday', category: 'Gifts', supplier: 'Paper Dreams', cost: 0.45, rrp: 2.95, stock: 150, sales_last_month: 80, sales_hist: 1200 },
];

// --- LOGIC: UK Weeks of Cover Benchmarks ---
const getCategoryTargetWeeks = (category) => {
  if (!category) return 10; // Default fallback
  const c = category.toLowerCase();

  if (c.includes('fashion') || c.includes('clothing') || c.includes('apparel')) return 9; // 7-11 weeks
  if (c.includes('footwear') || c.includes('shoe')) return 9; // 7-11 weeks
  if (c.includes('jewel') || c.includes('watch')) return 33; // 22-45 weeks (High value)
  if (c.includes('furniture') || c.includes('sofa') || c.includes('bed')) return 12; // 9-15 weeks
  if (c.includes('homeware') || c.includes('gift')) return 9; // 7-11 weeks
  if (c.includes('beauty') || c.includes('health') || c.includes('cosmetic')) return 6; // 4-7 weeks
  if (c.includes('sport') || c.includes('outdoor')) return 8; // 6-9 weeks
  if (c.includes('toy') || c.includes('game')) return 9; // 7-11 weeks
  if (c.includes('book') || c.includes('stationery')) return 6; // 5-7 weeks
  if (c.includes('electr') || c.includes('tech')) return 5; // 3-7 weeks
  if (c.includes('garden') || c.includes('plant')) return 6; // Shoulder season avg

  return 10; // General UK Independent Average
};

// --- Helper Components ---

const FormattedText = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks = [];
  let currentTable = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') || (trimmed.split('|').length > 2)) {
      currentTable.push(trimmed);
    } else {
      if (currentTable.length > 0) {
        blocks.push({ type: 'table', content: currentTable });
        currentTable = [];
      }
      if (trimmed) {
        blocks.push({ type: 'text', content: line });
      }
    }
  });
  if (currentTable.length > 0) blocks.push({ type: 'table', content: currentTable });

  return (
    <div className="text-sm text-stone-600 leading-relaxed space-y-3 font-['Poppins']">
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          const rows = block.content.map(row => 
            row.split('|')
               .map(cell => cell.trim())
               .filter(cell => cell !== '') 
          ).filter(row => row.length > 0);
          
          const cleanRows = rows.filter(row => {
             const rowString = row.join('');
             return !/^[-:|]+$/.test(rowString); 
          });

          if (cleanRows.length === 0) return null;

          return (
            <div key={idx} className="overflow-x-auto my-4 rounded-xl border border-[#E9AD5D]/30 shadow-sm bg-white">
              <table className="min-w-full divide-y divide-[#F9EFDD]">
                <thead className="bg-[#F9EFDD]">
                  <tr>
                    {cleanRows[0].map((header, hIdx) => (
                      <th key={hIdx} className="px-4 py-3 text-left text-xs font-bold text-[#778472] uppercase tracking-wider font-['Poppins']">
                        {header.replace(/\*\*/g, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {cleanRows.slice(1).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#F9EFDD]/20 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-3 text-sm text-[#071013]">
                           {cell.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => 
                              part.startsWith('**') ? <strong key={pIdx} className="text-[#778472]">{part.slice(2, -2)}</strong> : part
                           )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        } else {
          const isList = block.content.trim().startsWith('- ') || block.content.trim().startsWith('* ');
          const cleanContent = isList ? block.content.trim().substring(2) : block.content;
          
          const parts = cleanContent.split(/(\*\*.*?\*\*)/g);
          const renderedContent = parts.map((part, i) => 
            part.startsWith('**') && part.endsWith('**') 
              ? <strong key={i} className="text-[#778472] font-bold">{part.slice(2, -2)}</strong> 
              : part
          );

          if (isList) {
             return (
               <div key={idx} className="flex items-start gap-2.5 ml-1">
                 <span className="text-[#E9AD5D] mt-1.5 text-lg leading-none">•</span>
                 <p>{renderedContent}</p>
               </div>
             );
          }
          return <p key={idx}>{renderedContent}</p>;
        }
      })}
    </div>
  );
};

const StatCard = ({ title, value, subtext, trend }) => {
  const valueStr = value.toString();
  const isCurrency = valueStr.includes('£');
  const displayValue = isCurrency ? valueStr.replace('£', '') : valueStr;

  return (
    <div className="bg-white p-6 rounded-xl border border-[#E9AD5D]/30 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between relative overflow-hidden group">
      <div className="relative z-10">
        <h3 className="text-xs font-bold text-[#778472] uppercase tracking-widest mb-3 font-['Poppins']">{title}</h3>
        <div className="flex items-baseline font-['Poppins']">
          {isCurrency && (
            <span className="text-2xl font-medium text-[#778472]/60 mr-1.5 select-none">£</span>
          )}
          <span className="text-4xl font-extrabold text-[#071013] tracking-tight">{displayValue}</span>
        </div>
      </div>
      
      <div className="mt-5 flex items-center gap-2 relative z-10 font-['Poppins']">
         {trend && (
          <div className={`flex items-center justify-center w-6 h-6 rounded-full ${trend === 'up' ? 'bg-[#778472]/20 text-[#778472]' : 'bg-[#D12323]/10 text-[#D12323]'}`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          </div>
        )}
        <span className="text-sm font-medium text-[#071013]/60 leading-tight">{subtext}</span>
      </div>
      
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#F9EFDD] rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  );
};

const GlobalChatbot = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm 'The Reluctant Retailer' AI. How can I help you optimise your shop today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await callGemini(input, {}); 

    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-[#778472]/20 flex flex-col z-50 animate-in slide-in-from-bottom-10 duration-300 overflow-hidden font-['Poppins']">
      <div className="bg-[#778472] p-4 flex justify-between items-center text-[#F9EFDD]">
        <div className="flex items-center gap-3">
          <div className="bg-[#F9EFDD]/20 p-2 rounded-full">
            <Sparkles size={16} className="text-[#E9AD5D]" />
          </div>
          <div>
            <h3 className="font-bold text-lg font-['Caveat'] tracking-wide">Ask The Retailer</h3>
            <p className="text-[10px] text-[#F9EFDD]/80 uppercase tracking-widest font-sans">Virtual Mentor</p>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-[#F9EFDD]/20 p-1 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F9EFDD]/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-[#778472] text-white rounded-tr-none' 
                : 'bg-white border border-[#E9AD5D]/20 text-[#071013] rounded-tl-none'
            }`}>
              <FormattedText text={msg.text} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-[#E9AD5D]/20 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#778472]" />
                <span className="text-xs text-stone-400">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-[#778472]/10 flex gap-2">
        <input 
          className="flex-1 bg-[#F9EFDD] rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#778472] transition-all text-[#071013] placeholder-[#071013]/40"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="bg-[#778472] text-[#F9EFDD] p-3 rounded-full hover:bg-[#5f6a5a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

// --- Modals ---

const WSSIDetailModal = ({ isOpen, onClose, categoryName, products }) => {
    if (!isOpen) return null;
    
    // Recalculate target weeks for context
    const targetWeeks = getCategoryTargetWeeks(categoryName);

    return (
        <div className="fixed inset-0 bg-[#071013]/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200 font-['Poppins']">
            <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300 border-2 border-[#778472]">
                
                {/* Header */}
                <div className="p-5 border-b border-[#F9EFDD] flex justify-between items-center bg-[#778472] text-[#F9EFDD]">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#F9EFDD]/20 p-2 rounded-full">
                            <CalendarRange size={20} className="text-[#E9AD5D]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl font-['Caveat']">{categoryName} WSSI Detail</h3>
                            <p className="text-xs text-[#F9EFDD]/80 uppercase tracking-wider">Weekly Sales, Stock & Intake Plan</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#F9EFDD]/70 hover:text-[#F9EFDD] transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto bg-white flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs text-[#071013]/50 uppercase bg-[#F9EFDD] sticky top-0 z-10 border-b border-[#E9AD5D]/20">
                            <tr>
                                <th className="px-6 py-4 font-bold">Product</th>
                                <th className="px-6 py-4 font-bold text-right">Current Stock</th>
                                <th className="px-6 py-4 font-bold text-right">Wkly Sales</th>
                                <th className="px-6 py-4 font-bold text-center">Cover (Wks)</th>
                                <th className="px-6 py-4 font-bold text-right bg-[#F9EFDD]/30">4-Wk Forecast</th>
                                <th className="px-6 py-4 font-bold text-right bg-[#F9EFDD]/30">Proj. Close Stock</th>
                                <th className="px-6 py-4 font-bold text-right text-[#778472]">Intake Req</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9AD5D]/10 bg-white">
                            {products.map((item) => {
                                const stockVal = item.stock * item.cost;
                                const weeklySalesCost = (item.sales_last_month * item.cost) / 4;
                                const weeklySalesUnits = item.sales_last_month / 4;
                                const currentCover = weeklySalesCost > 0 ? (stockVal / weeklySalesCost) : 999;
                                
                                // Forward Calculations (Value)
                                const forecastSalesVal = weeklySalesCost * 4;
                                const projectedStockVal = Math.max(0, stockVal - forecastSalesVal);
                                const targetStockVal = weeklySalesCost * targetWeeks;
                                const intakeReqVal = Math.max(0, targetStockVal - projectedStockVal);

                                // Forward Calculations (Units)
                                const forecastSalesUnits = weeklySalesUnits * 4;
                                const projectedStockUnits = Math.max(0, item.stock - forecastSalesUnits);
                                const targetStockUnits = weeklySalesUnits * targetWeeks;
                                const intakeReqUnits = Math.max(0, targetStockUnits - projectedStockUnits);

                                // Status color logic
                                let coverColor = "text-[#071013]";
                                if (currentCover > targetWeeks * 1.5) coverColor = "text-[#D12323] font-bold";
                                if (currentCover < targetWeeks * 0.8) coverColor = "text-[#E9AD5D] font-bold";

                                return (
                                    <tr key={item.id} className="hover:bg-[#F9EFDD]/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[#071013]">{item.name}</td>
                                        
                                        {/* Current Stock */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-[#071013]">£{stockVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                                            <div className="text-xs text-[#071013]/60 flex items-center justify-end gap-1"><Package size={10}/> {item.stock} units</div>
                                        </td>

                                        {/* Weekly Sales */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-[#071013]">£{weeklySalesCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                                            <div className="text-xs text-[#071013]/60 flex items-center justify-end gap-1"><Package size={10}/> {weeklySalesUnits.toFixed(1)} units</div>
                                        </td>

                                        <td className={`px-6 py-4 text-center ${coverColor}`}>
                                            {currentCover > 52 ? '52+' : currentCover.toFixed(1)}
                                        </td>

                                        {/* Forecast */}
                                        <td className="px-6 py-4 text-right bg-[#F9EFDD]/10">
                                            <div className="text-[#071013]/70">£{forecastSalesVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                                            <div className="text-xs text-[#071013]/40">{forecastSalesUnits.toFixed(1)} units</div>
                                        </td>

                                        {/* Projected Close */}
                                        <td className="px-6 py-4 text-right bg-[#F9EFDD]/10">
                                            <div className="text-[#071013]/70">£{projectedStockVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                                            <div className="text-xs text-[#071013]/40">{projectedStockUnits.toFixed(1)} units</div>
                                        </td>
                                        
                                        {/* Intake Req */}
                                        <td className={`px-6 py-4 text-right font-bold ${intakeReqVal > 0 ? 'text-[#778472]' : 'text-[#071013]/20'}`}>
                                            <div className="font-bold">£{intakeReqVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                                            <div className="text-xs text-[#778472]/70 flex items-center justify-end gap-1"><Package size={10}/> {Math.ceil(intakeReqUnits)} units</div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-stone-400">No products found in this category.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 border-t border-[#F9EFDD] bg-[#F9EFDD]/30 rounded-b-2xl flex justify-between items-center">
                    <div className="text-xs text-[#071013]/50 italic">
                        Target Weeks Cover for {categoryName}: <strong>{targetWeeks}</strong>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-[#778472]/20 rounded-lg text-[#778472] font-bold hover:bg-[#F9EFDD] transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const CategoryDetailModal = ({ isOpen, onClose, categoryName, products }) => {
  if (!isOpen) return null;
  
  const targetWeeks = getCategoryTargetWeeks(categoryName);

  return (
    <div className="fixed inset-0 bg-[#071013]/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200 font-['Poppins']">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300 border-2 border-[#778472]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#F9EFDD] flex justify-between items-center bg-[#778472] text-[#F9EFDD]">
          <div className="flex items-center gap-3">
             <div className="bg-[#F9EFDD]/20 p-2 rounded-full">
                <BarChart3 size={20} className="text-[#E9AD5D]" />
             </div>
             <div>
               <h3 className="font-bold text-xl font-['Caveat']">{categoryName} Details</h3>
               <p className="text-xs text-[#F9EFDD]/80 uppercase tracking-wider">Target Weeks Cover: {targetWeeks}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-[#F9EFDD]/70 hover:text-[#F9EFDD] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-0 overflow-y-auto bg-white flex-1">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-[#071013]/50 uppercase bg-[#F9EFDD] sticky top-0 z-10 border-b border-[#E9AD5D]/20">
              <tr>
                <th className="px-6 py-4 font-bold">Product Name</th>
                <th className="px-6 py-4 font-bold text-right">Cost</th>
                <th className="px-6 py-4 font-bold text-right">Price</th>
                <th className="px-6 py-4 font-bold text-right">Margin</th>
                <th className="px-6 py-4 font-bold text-right">Stock</th>
                <th className="px-6 py-4 font-bold text-right">Sales (30d)</th>
                <th className="px-6 py-4 font-bold text-right">Weeks Cover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9AD5D]/10 bg-white">
              {products.map((item) => {
                const exVat = item.rrp / 1.2;
                const margin = item.rrp > 0 ? ((exVat - item.cost) / exVat) * 100 : 0;
                const weeksCover = item.sales_last_month > 0 ? (item.stock / (item.sales_last_month / 4)) : 999;
                
                // Color code weeks cover
                let coverColor = "text-[#071013]";
                if (weeksCover > (targetWeeks * 1.5)) coverColor = "text-[#D12323] font-bold"; // Overstocked
                if (weeksCover < (targetWeeks * 0.8)) coverColor = "text-[#E9AD5D] font-bold"; // Low Stock

                return (
                  <tr key={item.id} className="hover:bg-[#F9EFDD]/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#071013]">{item.name}</td>
                    <td className="px-6 py-4 text-right text-[#071013]/60">£{item.cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-[#071013] font-bold">£{item.rrp.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                       <span className={`font-bold px-2 py-1 rounded ${margin < 45 ? 'bg-[#D12323]/10 text-[#D12323]' : 'bg-green-100 text-green-700'}`}>
                        {margin.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{item.stock}</td>
                    <td className="px-6 py-4 text-right text-[#778472] font-bold">{item.sales_last_month}</td>
                    <td className={`px-6 py-4 text-right ${coverColor}`}>
                      {weeksCover === 999 ? "∞" : weeksCover.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-stone-400">No products found in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-[#F9EFDD] bg-[#F9EFDD]/30 rounded-b-2xl flex justify-end">
           <button onClick={onClose} className="px-6 py-2 bg-white border border-[#778472]/20 rounded-lg text-[#778472] font-bold hover:bg-[#F9EFDD] transition-colors">
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

const BudgetModal = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;
  
  const { targetStock, currentStock, budget } = data;

  return (
    <div className="fixed inset-0 bg-[#071013]/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200 font-['Poppins']">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 border-2 border-[#778472]">
        <div className="p-5 border-b border-[#F9EFDD] flex justify-between items-center bg-[#778472] text-[#F9EFDD]">
          <div className="flex items-center gap-3">
             <div className="bg-[#F9EFDD]/20 p-2 rounded-full">
                <Calculator size={20} className="text-[#E9AD5D]" />
             </div>
             <h3 className="font-bold text-xl font-['Caveat']">Buying Budget</h3>
          </div>
          <button onClick={onClose} className="text-[#F9EFDD]/70 hover:text-[#F9EFDD] transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6 bg-white">
           <div className="bg-[#F9EFDD]/30 p-4 rounded-xl border border-[#778472]/10 text-sm text-[#071013]/70 italic">
             "Target Stock calculates the ideal inventory level based on UK Independent Retailer benchmarks for each category (e.g. 9 weeks for Homeware, 33 for Jewellery)."
           </div>
           
           <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#F9EFDD]">
                 <span className="text-[#071013]/60 font-medium">Ideal Stock (The Goal)</span>
                 <span className="text-[#071013] font-bold">£{targetStock.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#F9EFDD]">
                 <span className="text-[#071013]/60 font-medium">Current Stock (Actual)</span>
                 <span className="text-[#D12323] font-bold">- £{currentStock.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                 <span className="text-[#778472] font-extrabold text-lg">Open to Buy (Budget)</span>
                 <span className="text-[#778472] font-extrabold text-xl">£{budget.toLocaleString()}</span>
              </div>
           </div>

           <div className="text-xs text-[#071013]/40 text-center">
             Calculated using specific category targets + sales velocity.
           </div>
        </div>
        <div className="p-4 border-t border-[#F9EFDD] bg-[#F9EFDD]/30 rounded-b-2xl">
           <button onClick={onClose} className="w-full py-2 bg-white border border-[#778472]/20 rounded-lg text-[#778472] font-bold hover:bg-[#F9EFDD] transition-colors">
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

const MarketingModal = ({ isOpen, onClose, content, isLoading, productName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#071013]/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200 font-['Poppins']">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-4 duration-300 border-2 border-[#E9AD5D]">
        <div className="p-5 border-b border-[#F9EFDD] flex justify-between items-center bg-[#F9EFDD]">
          <div className="flex items-center gap-3">
            <div className="bg-[#E9AD5D]/20 p-2 rounded-full">
               <Megaphone size={20} className="text-[#E9AD5D]" />
            </div>
            <div>
              <h3 className="font-bold text-xl font-['Caveat'] text-[#071013]">Magic Marketing</h3>
              <p className="text-xs text-[#071013]/60 uppercase tracking-wider">For: {productName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#071013]/50 hover:text-[#071013] transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 size={40} className="animate-spin text-[#E9AD5D]" />
              <p className="text-sm text-[#071013]/60 font-medium animate-pulse italic">Writing your post...</p>
            </div>
          ) : (
            <div className="prose prose-stone prose-sm leading-relaxed whitespace-pre-wrap">
              <FormattedText text={content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AiConsultantModal = ({ isOpen, onClose, advice, isLoading, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#071013]/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200 font-['Poppins']">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-4 duration-300 border-2 border-[#778472]">
        <div className="p-5 border-b border-[#F9EFDD] flex justify-between items-center bg-[#778472] text-[#F9EFDD]">
          <div className="flex items-center gap-3">
            <div className="bg-[#F9EFDD]/20 p-2 rounded-full">
               <Sparkles size={20} className="text-[#E9AD5D]" />
            </div>
            <div>
              <h3 className="font-bold text-xl font-['Caveat']">Retail Mentor</h3>
              <p className="text-xs text-[#F9EFDD]/80 uppercase tracking-wider">Guidance from the book</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#F9EFDD]/70 hover:text-[#F9EFDD] transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 size={40} className="animate-spin text-[#778472]" />
              <p className="text-sm text-[#071013]/60 font-medium animate-pulse italic">Reviewing your numbers...</p>
            </div>
          ) : (
            <div>
              <h4 className="font-bold text-[#778472] mb-4 text-lg uppercase tracking-wide">{title}</h4>
              <FormattedText text={advice} />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-[#F9EFDD] bg-[#F9EFDD]/30 rounded-b-2xl flex justify-between items-center">
           <span className="text-xs text-[#071013]/50 italic font-['Caveat'] text-lg">"Profit is sanity, turnover is vanity"</span>
          <button onClick={onClose} className="px-6 py-2 bg-[#778472] hover:bg-[#5f6a5a] text-[#F9EFDD] rounded-full text-sm font-bold transition-colors shadow-sm">
            Got it, thanks
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Views ---

// 1. STOCK ROOM VIEW
const StockRoom = ({ inventory, setInventory }) => {
  const [newItem, setNewItem] = useState({ name: '', category: '', supplier: '', cost: '', rrp: '', stock: '', sales_last_month: '', sales_hist: '' });
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [marketingContent, setMarketingContent] = useState('');
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [currentProduct, setCurrentProduct] = useState('');
  const fileInputRef = useRef(null);

  const handleAddItem = () => {
    if (!newItem.name) return;
    const item = {
      id: Date.now(),
      ...newItem,
      category: newItem.category || 'General', // Default if empty
      cost: parseFloat(newItem.cost) || 0,
      rrp: parseFloat(newItem.rrp) || 0,
      stock: parseInt(newItem.stock) || 0,
      sales_last_month: parseInt(newItem.sales_last_month) || 0,
      sales_hist: parseInt(newItem.sales_hist) || 0,
    };
    setInventory([...inventory, item]);
    setNewItem({ name: '', category: '', supplier: '', cost: '', rrp: '', stock: '', sales_last_month: '', sales_hist: '' });
  };

  const handleDelete = (id) => {
    setInventory(inventory.filter(i => i.id !== id));
  };

  const handleGenerateMarketing = async (item) => {
    setCurrentProduct(item.name);
    setMarketingModalOpen(true);
    setMarketingLoading(true);

    const prompt = `Write creative marketing copy for this product:
    Product: ${item.name}
    Category: ${item.category}
    
    Please provide two outputs:
    1. **Instagram Caption:** Engaging, friendly, with 3-5 relevant hashtags. British English.
    2. **Shelf Talker:** A 1-sentence catchy description to place next to the price tag in the shop.`;

    const response = await callGemini(prompt, item);
    setMarketingContent(response);
    setMarketingLoading(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const lines = content.split('\n');
      const newItems = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',');
        if (cols.length >= 2) {
           newItems.push({
             id: Date.now() + i,
             name: cols[0]?.trim() || 'Unknown Item',
             category: cols[1]?.trim() || 'General',
             supplier: cols[2]?.trim() || '',
             cost: parseFloat(cols[3]) || 0,
             rrp: parseFloat(cols[4]) || 0,
             stock: parseInt(cols[5]) || 0,
             sales_last_month: parseInt(cols[6]) || 0,
             sales_hist: 0
           });
        }
      }
      
      if (newItems.length > 0) {
        setInventory([...inventory, ...newItems]);
        alert(`Successfully added ${newItems.length} items from CSV!`);
      }
    };
    reader.readAsText(file);
  };

  const downloadCSV = () => {
    const headers = ["Product Name,Category,Supplier,Cost Price,Selling Price,Current Stock,Sales (30d)"];
    const rows = inventory.map(item => 
      `"${item.name}","${item.category}","${item.supplier}",${item.cost},${item.rrp},${item.stock},${item.sales_last_month}`
    );
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "stock_room_inventory.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMargin = (cost, rrp) => {
    if (!rrp || rrp === 0) return 0;
    const exVat = rrp / 1.2; 
    return ((exVat - cost) / exVat) * 100;
  };

  // Helper: Calculate Target Stock (10 weeks cover) based on last 30d sales (Units)
  const getTargetStock = (sales30d) => {
    const weeklySales = sales30d / 4;
    return Math.ceil(weeklySales * 10); // 10 weeks cover in units
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-[#E9AD5D]/20 overflow-hidden font-['Poppins']">
      <div className="p-6 border-b border-[#F9EFDD] bg-white flex justify-between items-center">
        <div>
          <h2 className="font-bold text-[#071013] text-xl flex items-center gap-2 font-['Poppins']">
            <Store size={24} className="text-[#778472]" /> 
            The Stock Room
          </h2>
          <p className="text-sm text-[#071013]/60 mt-1">Your inventory log. Keep it accurate.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            className="flex items-center gap-2 text-sm font-medium text-[#F9EFDD] bg-[#778472] px-4 py-2 rounded-full hover:bg-[#5f6a5a] transition-colors shadow-sm"
          >
             <UploadCloud size={16} /> Upload Stock (CSV)
          </button>
          <button 
             onClick={downloadCSV}
             className="flex items-center gap-2 text-sm font-medium text-[#778472] bg-[#F9EFDD] px-4 py-2 rounded-full hover:bg-[#F9EFDD]/80 transition-colors border border-[#778472]/20"
          >
             <Download size={16} /> Download List
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-[#F9EFDD]/20">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-[#071013]/50 uppercase bg-[#F9EFDD] sticky top-0 z-10 border-b border-[#E9AD5D]/20">
            <tr>
              <th className="px-6 py-4 font-bold">Product</th>
              <th className="px-6 py-4 font-bold">Category</th>
              <th className="px-6 py-4 font-bold text-right">Cost</th>
              <th className="px-6 py-4 font-bold text-right">Price</th>
              <th className="px-6 py-4 font-bold text-right">Margin</th>
              <th className="px-6 py-4 font-bold text-right">Stock</th>
              <th className="px-6 py-4 font-bold text-right">Sold (30d)</th>
              <th className="px-6 py-4 font-bold text-right">Target (10wks)</th>
              <th className="px-6 py-4 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9AD5D]/10 bg-white">
            {inventory.map((item) => {
               const target = getTargetStock(item.sales_last_month);
               const isLow = item.stock < target;
               return (
                <tr key={item.id} className="hover:bg-[#F9EFDD]/30 transition-colors group">
                  <td className="px-6 py-4 font-medium text-[#071013]">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-[#F9EFDD] rounded-md text-xs font-medium text-[#778472] border border-[#E9AD5D]/20">{item.category}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-[#071013]/60">£{item.cost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-[#071013] font-bold">£{item.rrp.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold px-2 py-1 rounded ${getMargin(item.cost, item.rrp) < 45 ? 'bg-[#D12323]/10 text-[#D12323]' : 'bg-green-100 text-green-700'}`}>
                      {getMargin(item.cost, item.rrp).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{item.stock}</td>
                  <td className="px-6 py-4 text-right text-[#778472] font-bold">{item.sales_last_month}</td>
                  <td className={`px-6 py-4 text-right font-bold ${isLow ? 'text-[#E9AD5D]' : 'text-[#071013]/30'}`}>
                     {target}
                  </td>
                  <td className="px-6 py-4 text-center flex justify-center gap-2">
                    <button 
                      onClick={() => handleGenerateMarketing(item)}
                      className="p-1.5 bg-pink-100 text-pink-600 rounded hover:bg-pink-200 transition-colors"
                      title="Generate Marketing Copy"
                    >
                      <Megaphone size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                  </td>
                </tr>
               );
            })}
            <tr className="bg-[#F9EFDD]/10 border-t-2 border-[#E9AD5D]/20">
              <td className="px-6 py-3"><input placeholder="New Item Name" className="w-full p-2 border border-[#E9AD5D]/20 rounded-lg focus:ring-2 focus:ring-[#778472] outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></td>
              <td className="px-6 py-3">
                <input 
                  placeholder="e.g. Homeware" 
                  className="w-full p-2 border border-[#E9AD5D]/20 rounded-lg" 
                  value={newItem.category} 
                  onChange={e => setNewItem({...newItem, category: e.target.value})} 
                />
              </td>
              <td className="px-6 py-3 text-right"><input type="number" placeholder="0.00" className="w-20 p-2 border border-[#E9AD5D]/20 rounded-lg text-right" value={newItem.cost} onChange={e => setNewItem({...newItem, cost: e.target.value})} /></td>
              <td className="px-6 py-3 text-right"><input type="number" placeholder="0.00" className="w-20 p-2 border border-[#E9AD5D]/20 rounded-lg text-right" value={newItem.rrp} onChange={e => setNewItem({...newItem, rrp: e.target.value})} /></td>
              <td className="px-6 py-3 text-center text-[#071013]/30">-</td>
              <td className="px-6 py-3 text-right"><input type="number" placeholder="0" className="w-16 p-2 border border-[#E9AD5D]/20 rounded-lg text-right" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} /></td>
              <td className="px-6 py-3 text-right"><input type="number" placeholder="0" className="w-16 p-2 border border-[#E9AD5D]/20 rounded-lg text-right" value={newItem.sales_last_month} onChange={e => setNewItem({...newItem, sales_last_month: e.target.value})} /></td>
              <td className="px-6 py-3 text-center">-</td>
              <td className="px-6 py-3 text-center">
                <button onClick={handleAddItem} className="bg-[#778472] text-[#F9EFDD] p-2 rounded-lg hover:bg-[#5f6a5a] shadow-sm transition-all"><Plus size={20} /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <MarketingModal 
        isOpen={marketingModalOpen} 
        onClose={() => setMarketingModalOpen(false)} 
        content={marketingContent} 
        isLoading={marketingLoading}
        productName={currentProduct}
      />
    </div>
  );
};

// 2. BIG PICTURE VIEW
const BigPicture = ({ inventory }) => {
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  // Add state for selected category for the detail modal
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Helper to filter products for the modal
  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return inventory.filter(item => (item.category || 'Uncategorized') === selectedCategory);
  }, [inventory, selectedCategory]);
  
  const stats = useMemo(() => {
    const totalStockVal = inventory.reduce((acc, item) => acc + (item.stock * item.cost), 0);
    const totalSalesVal = inventory.reduce((acc, item) => acc + (item.sales_last_month * item.rrp), 0);
    const totalItemsSold = inventory.reduce((acc, item) => acc + item.sales_last_month, 0);
    // Avoid division by zero
    const avgWeeklySales = totalItemsSold / 4;
    const weeksCover = avgWeeklySales > 0 ? (inventory.reduce((acc, item) => acc + item.stock, 0) / avgWeeklySales) : 0;

    return { totalStockVal, totalSalesVal, weeksCover };
  }, [inventory]);

  // Budget Calculation Logic (Variable Target Weeks)
  const budgetData = useMemo(() => {
    let totalTargetStockVal = 0;
    
    inventory.forEach(item => {
       const weeklySales = item.sales_last_month / 4;
       // Get category specific target weeks
       const targetWeeks = getCategoryTargetWeeks(item.category);
       const itemTargetStockVal = weeklySales * item.cost * targetWeeks;
       totalTargetStockVal += itemTargetStockVal;
    });

    const currentStock = stats.totalStockVal;
    const budget = Math.max(0, totalTargetStockVal - currentStock);
    
    return {
      targetStock: Math.round(totalTargetStockVal),
      currentStock: Math.round(currentStock),
      budget: Math.round(budget)
    };
  }, [inventory, stats.totalStockVal]);

  const categoryBreakdown = useMemo(() => {
    const cats = {};
    inventory.forEach(item => {
      // Use default if category is missing
      const catName = item.category || 'Uncategorized';
      if (!cats[catName]) cats[catName] = { sales: 0, stock: 0, marginSum: 0, count: 0, salesQty: 0, costSum: 0 };
      
      cats[catName].sales += (item.sales_last_month * item.rrp);
      cats[catName].stock += (item.stock * item.cost);
      cats[catName].salesQty += item.sales_last_month;
      cats[catName].costSum += (item.cost * item.sales_last_month); // Weighted cost for target calc
      
      const exVat = item.rrp / 1.2;
      const m = item.rrp > 0 ? ((exVat - item.cost) / exVat) : 0;
      cats[catName].marginSum += m;
      cats[catName].count += 1;
    });
    
    return Object.keys(cats).map(k => {
       const weeklySalesQty = cats[k].salesQty / 4;
       // Target Stock Value based on category specific benchmark
       // We iterate through items to get exact target value per category
       let catTargetStockVal = 0;
       inventory.filter(i => (i.category || 'Uncategorized') === k).forEach(i => {
          const weeks = getCategoryTargetWeeks(i.category);
          catTargetStockVal += (i.sales_last_month / 4) * i.cost * weeks;
       });

       return {
        name: k,
        sales: cats[k].sales,
        stock: cats[k].stock,
        targetStock: catTargetStockVal,
        avgMargin: cats[k].count > 0 ? (cats[k].marginSum / cats[k].count) * 100 : 0
      };
    });
  }, [inventory]);

  const handleExecutiveSummary = async () => {
    setAiModalOpen(true);
    setAiLoading(true);
    setAiAdvice("");

    const prompt = `Act as a friendly retail mentor. Look at my shop's data below.
    Give me a "Shop Health Check".
    1. Start with something positive.
    2. Point out one area where I might be tying up too much cash (Overstock).
    3. Point out one opportunity to make more money (Margin or Best Sellers).
    
    Data:
    - Cash tied up in Stock: £${stats.totalStockVal.toFixed(2)}
    - Recent Sales: £${stats.totalSalesVal.toFixed(2)}
    - Weeks of Stock: ${stats.weeksCover.toFixed(1)} (Ideal is variable, approx 10)
    
    Category Breakdown: ${JSON.stringify(categoryBreakdown)}`;

    const advice = await callGemini(prompt, {});
    setAiAdvice(advice);
    setAiLoading(false);
  };

  return (
    <div className="space-y-6 h-full overflow-auto pr-2 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
         <div>
           <h2 className="font-bold text-indigo-900 text-xl">How is the shop doing?</h2>
           <p className="text-indigo-700/80 text-sm mt-1">Here is your real-time pulse check.</p>
         </div>
         <button 
           onClick={handleExecutiveSummary}
           className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all text-sm font-bold border border-indigo-100"
         >
           <Sparkles size={18} className="text-yellow-500" />
           Run Health Check
         </button>
      </div>

      {/* Top Stats - Balanced Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Cash in Stock" value={`£${stats.totalStockVal.toFixed(0)}`} subtext="Money sitting on shelves" color="stone" />
        <StatCard title="Sales (30 Days)" value={`£${stats.totalSalesVal.toFixed(0)}`} subtext="Money coming in" trend="up" />
        <StatCard title="Weeks of Stock" value={`${stats.weeksCover.toFixed(1)}`} subtext="Overall Avg (Targets vary)" trend={stats.weeksCover > 16 ? "down" : "up"} />
        <StatCard title="Avg Profit Margin" value="52%" subtext="Aim for 50%+" trend="up" />
      </div>

      {/* Main Visuals - Equal Columns & Spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden h-full flex flex-col">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50">
            <h3 className="font-bold text-stone-800 text-lg flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-500" />
              Category Breakdown
            </h3>
            <p className="text-stone-400 text-xs mt-1">Which departments are working hardest for you? (Click row to see details)</p>
          </div>
          <div className="p-6 flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-400 uppercase border-b border-stone-100">
                  <th className="text-left py-3 font-semibold pl-2">Category</th>
                  <th className="text-right py-3 font-semibold">Sales (£)</th>
                  <th className="text-right py-3 font-semibold">Stock Value (£)</th>
                  <th className="text-right py-3 font-semibold">Stock Turn</th>
                  <th className="text-right py-3 font-semibold">Target Stock</th>
                  <th className="text-right py-3 font-semibold pr-2">Margin</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map(cat => (
                  <tr 
                     key={cat.name} 
                     onClick={() => setSelectedCategory(cat.name)}
                     className="border-b border-stone-50 last:border-0 hover:bg-[#F9EFDD]/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 font-medium text-stone-900 pl-2 flex items-center gap-2">
                       {cat.name}
                       <Eye size={14} className="text-[#E9AD5D] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    <td className="py-4 text-right font-bold text-stone-700">£{cat.sales.toFixed(0)}</td>
                    <td className="py-4 text-right text-stone-500">£{cat.stock.toFixed(0)}</td>
                    <td className="py-4 text-right text-stone-600">{(cat.sales / (cat.stock || 1)).toFixed(1)}</td>
                    <td className="py-4 text-right text-[#E9AD5D] font-bold">£{cat.targetStock.toFixed(0)}</td>
                    <td className="py-4 text-right font-bold text-[#778472] pr-2">{cat.avgMargin.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buying Budget (OTB) */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50">
            <h3 className="font-bold text-stone-800 text-lg flex items-center gap-2">
              <Calculator size={20} className="text-emerald-500" />
              Buying Budget
            </h3>
            <p className="text-stone-400 text-xs mt-1">Can I afford new stock?</p>
          </div>
          <div className="p-8 flex-1 flex flex-col justify-center items-center text-center">
            <div className="w-40 h-40 rounded-full border-8 border-emerald-50 flex items-center justify-center mb-6 bg-white shadow-inner">
              <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">£{budgetData.budget.toLocaleString()}</span>
            </div>
            <h4 className="text-stone-900 font-bold text-lg mb-2">{budgetData.budget > 0 ? "Yes, you have budget." : "Hold off buying."}</h4>
            <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
              Based on your current sales and stock levels, you can safely spend up to <strong>£{budgetData.budget.toLocaleString()}</strong> this month on new stock without overfilling your stock room.
            </p>
            <button 
              onClick={() => setBudgetModalOpen(true)}
              className="mt-8 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-emerald-100 transition-colors"
            >
              See Calculation
            </button>
          </div>
        </div>
      </div>

      <AiConsultantModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)} 
        advice={aiAdvice} 
        isLoading={aiLoading} 
        title="Shop Health Check"
      />
      
      <BudgetModal 
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        data={budgetData}
      />
      
      <CategoryDetailModal 
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        categoryName={selectedCategory}
        products={categoryProducts}
      />
    </div>
  );
};

// 3. WEEKLY FOCUS VIEW
const WeeklyFocus = ({ inventory }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate Action Items based on Logic
  const actions = useMemo(() => {
    const list = [];
    inventory.forEach(item => {
      const weeksCover = item.stock / ((item.sales_last_month || 1) / 4);
      
      if (item.stock > 20 && item.sales_last_month < 3) {
        list.push({
          id: `slow-${item.id}`,
          type: 'clearance',
          severity: 'high',
          title: `Clearance Opportunity: ${item.name}`,
          desc: `This item is taking up space. You have ${item.stock} units but only sold ${item.sales_last_month} recently. Let's turn this back into cash.`,
          itemData: item
        });
      }

      if (item.stock < 10 && item.sales_last_month > 10) {
        list.push({
          id: `reorder-${item.id}`,
          type: 'restock',
          severity: 'medium',
          title: `Restock Alert: ${item.name}`,
          desc: `This is a winner! Selling fast with only ${item.stock} left. Don't run out of best sellers.`,
          itemData: item
        });
      }
      
      const exVat = item.rrp / 1.2;
      const margin = item.rrp > 0 ? ((exVat - item.cost) / exVat) * 100 : 0;
      if (margin < 40 && item.sales_last_month > 5) {
         list.push({
          id: `margin-${item.id}`,
          type: 'review',
          severity: 'low',
          title: `Profit Check: ${item.name}`,
          desc: `You're only making ${margin.toFixed(0)}% margin on this. Can we increase the price slightly or ask the supplier for a deal?`,
          itemData: item
        });
      }
    });
    return list;
  }, [inventory]);

  const handleAskAi = async (action) => {
    setAiTitle(action.title);
    setAiAdvice('');
    setModalOpen(true);
    setLoading(true);

    let prompt = "";
    if (action.type === 'review') { // MARGIN CHECK - NEW FEATURE
        prompt = `Write a polite but firm email to my supplier for ${action.itemData.supplier}.
        Context: I buy ${action.itemData.name} from them at £${action.itemData.cost}. I sell it at £${action.itemData.rrp}.
        The margin is too low (${((action.itemData.rrp/1.2 - action.itemData.cost)/(action.itemData.rrp/1.2)*100).toFixed(0)}%).
        Goal: Negotiate a better cost price so I can achieve a 50% margin without raising the RRP.`;
        setAiTitle("Draft Supplier Email");
    } else {
        prompt = `I have a situation in my shop: "${action.title}". 
        Context: ${action.desc}
        Product Info: Cost £${action.itemData.cost}, Price £${action.itemData.rrp}, Stock ${action.itemData.stock}.
        Act as a helpful retail coach. Give me 3 simple steps to handle this. Keep it positive.`;
    }

    const advice = await callGemini(prompt, action.itemData);
    setAiAdvice(advice);
    setLoading(false);
  };

  return (
    <div className="h-full overflow-auto pr-2 pb-20">
      <div className="mb-6 bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <h2 className="font-bold text-stone-800 text-xl flex items-center gap-2">
           <ListTodo size={24} className="text-indigo-600" />
           My Weekly Focus
        </h2>
        <p className="text-stone-500 text-sm mt-2 max-w-2xl">
          Don't get overwhelmed. These are the few things you can do this week to improve your cash flow and keep customers happy.
        </p>
      </div>

      <div className="space-y-6">
        {actions.length === 0 && (
          <div className="p-12 text-center text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
            <HeartHandshake className="mx-auto mb-4 opacity-50" size={48} />
            <p className="text-lg font-medium">Everything is running smoothly!</p>
            <p className="text-sm mt-2">Go spend some time on the shop floor with your customers.</p>
          </div>
        )}

        {actions.map(action => (
          <div key={action.id} className={`bg-white p-6 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all group ${
            action.severity === 'high' ? 'border-red-400' : action.severity === 'medium' ? 'border-amber-400' : 'border-blue-400'
          }`}>
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
                     action.type === 'clearance' ? 'bg-[#D12323]/10 text-[#D12323]' : 
                     action.type === 'restock' ? 'bg-[#E9AD5D]/20 text-[#B47B2B]' : 'bg-[#778472]/10 text-[#778472]'
                  }`}>
                    {action.type === 'clearance' ? 'Cash Flow' : action.type === 'restock' ? 'Best Seller' : 'Profit'}
                  </span>
                  <h3 className="font-bold text-[#071013] text-lg">{action.title}</h3>
                </div>
                <p className="text-stone-600 text-sm leading-relaxed">{action.desc}</p>
              </div>
              
              <button 
                onClick={() => handleAskAi(action)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#F9EFDD] text-[#778472] rounded-lg border border-[#E9AD5D]/30 hover:bg-[#778472] hover:text-[#F9EFDD] transition-all font-bold text-sm whitespace-nowrap"
              >
                {action.type === 'review' ? <Mail size={16} /> : <Sparkles size={16} />}
                {action.type === 'review' ? 'Negotiate' : 'Get Advice'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <AiConsultantModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        advice={aiAdvice} 
        isLoading={loading} 
        title={aiTitle}
      />
    </div>
  );
};

// --- New WSSI VIEW (Weekly Sales, Stock, Intake) ---
const WSSI = ({ inventory }) => {
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiAdvice, setAiAdvice] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    // State for the new detail modal
    const [selectedWSSICategory, setSelectedWSSICategory] = useState(null);
    
    // Aggregate data by category
    const wssiData = useMemo(() => {
        const cats = {};
        inventory.forEach(item => {
            const catName = item.category || 'Uncategorized';
            if (!cats[catName]) {
                cats[catName] = {
                    name: catName,
                    costSum: 0,
                    stockVal: 0,
                    stockUnits: 0, // NEW: Units
                    salesVal30d: 0,
                    salesUnits30d: 0, // NEW: Units
                    count: 0
                };
            }
            cats[catName].costSum += item.cost;
            cats[catName].stockVal += (item.stock * item.cost);
            cats[catName].stockUnits += item.stock; // Accumulate units
            
            cats[catName].salesVal30d += (item.sales_last_month * item.cost); // Sales at cost
            cats[catName].salesUnits30d += item.sales_last_month; // Accumulate units
            
            cats[catName].count += 1;
        });

        return Object.values(cats).map(cat => {
            // VALUE Calculations
            const weeklySalesCost = cat.salesVal30d / 4;
            const targetWeeks = getCategoryTargetWeeks(cat.name);
            const targetStockVal = weeklySalesCost * targetWeeks;
            const currentCover = weeklySalesCost > 0 ? (cat.stockVal / weeklySalesCost) : 999;
            
            // Forward Projections (Simplified Linear)
            // End of Month Stock = Current - (4 weeks sales)
            const projectedStock = Math.max(0, cat.stockVal - (weeklySalesCost * 4));
            
            // Intake Required = Target Stock - Projected Stock
            // If we have enough stock, intake is 0.
            const intakeReq = Math.max(0, targetStockVal - projectedStock);

            // UNIT Calculations
            const weeklySalesUnits = cat.salesUnits30d / 4;
            const targetStockUnits = Math.ceil(weeklySalesUnits * targetWeeks);
            const projectedStockUnits = Math.max(0, cat.stockUnits - (weeklySalesUnits * 4));
            const intakeReqUnits = Math.max(0, targetStockUnits - projectedStockUnits);

            return {
                ...cat,
                weeklySalesCost,
                weeklySalesUnits,
                targetWeeks,
                targetStockVal,
                targetStockUnits,
                currentCover,
                projectedStock,
                projectedStockUnits,
                intakeReq,
                intakeReqUnits
            };
        });
    }, [inventory]);

    // Filter products for the selected category modal
    const detailProducts = useMemo(() => {
        if (!selectedWSSICategory) return [];
        return inventory.filter(item => (item.category || 'Uncategorized') === selectedWSSICategory);
    }, [inventory, selectedWSSICategory]);

    const handleAnalyzeWSSI = async () => {
        setAiModalOpen(true);
        setAiLoading(true);
        setAiAdvice("");
    
        const prompt = `Act as a senior merchandise planner. Review this WSSI (Weekly Sales, Stock, Intake) data for an independent retailer.
        
        Analyze the "Forward Plan" (Next 4 Weeks).
        1. Identify which category has the highest "Intake Requirement" (Open to Buy).
        2. Identify any category that is significantly overstocked (Current Cover > Target Cover).
        3. Provide 3 specific actions to balance the stock.
        
        WSSI Data: ${JSON.stringify(wssiData.map(d => ({
            category: d.name,
            current_cover_weeks: d.currentCover.toFixed(1),
            target_cover_weeks: d.targetWeeks,
            intake_needed_GBP: d.intakeReq.toFixed(0),
            intake_needed_units: d.intakeReqUnits
        })))}`;
    
        const advice = await callGemini(prompt, {});
        setAiAdvice(advice);
        setAiLoading(false);
      };

    return (
        <div className="space-y-6 h-full overflow-auto pr-2 pb-20">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#F9EFDD] p-8 rounded-2xl border border-[#E9AD5D]/30 shadow-sm">
                <div>
                    <h2 className="font-bold text-[#071013] text-2xl font-['Caveat']">WSSI Planner</h2>
                    <p className="text-[#071013]/70 text-sm mt-1">Weekly Sales, Stock & Intake. Plan your future cash flow. (Click row to drill down)</p>
                </div>
                <button 
                    onClick={handleAnalyzeWSSI}
                    className="flex items-center gap-2 px-6 py-3 bg-[#778472] text-[#F9EFDD] rounded-full shadow-sm hover:bg-[#5f6a5a] hover:scale-105 transition-all text-sm font-bold border border-[#778472]"
                >
                    <Sparkles size={18} className="text-[#E9AD5D]" />
                    Analyze Forward Plan
                </button>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs text-[#071013]/50 uppercase bg-[#F9EFDD] border-b border-[#E9AD5D]/20">
                            <tr>
                                <th className="px-6 py-4 font-bold">Category</th>
                                <th className="px-6 py-4 font-bold text-right">Current Stock</th>
                                <th className="px-6 py-4 font-bold text-right">Wkly Sales</th>
                                <th className="px-6 py-4 font-bold text-center">Cover (Wks)</th>
                                <th className="px-6 py-4 font-bold text-center">Target (Wks)</th>
                                <th className="px-6 py-4 font-bold text-right bg-[#F9EFDD]/50">4-Wk Forecast</th>
                                <th className="px-6 py-4 font-bold text-right bg-[#F9EFDD]/50">Proj. Close Stock</th>
                                <th className="px-6 py-4 font-bold text-right text-[#778472]">Intake Required</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9AD5D]/10">
                            {wssiData.map(row => (
                                <tr 
                                    key={row.name} 
                                    onClick={() => setSelectedWSSICategory(row.name)}
                                    className="hover:bg-[#F9EFDD]/30 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4 font-medium text-[#071013] flex items-center gap-2">
                                        {row.name}
                                        <Eye size={14} className="text-[#E9AD5D] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </td>
                                    {/* Current Stock */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-bold">£{row.stockVal.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                        <div className="text-xs text-[#071013]/50 flex items-center justify-end gap-1"><Package size={10}/> {row.stockUnits} units</div>
                                    </td>
                                    
                                    {/* Weekly Sales */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-bold">£{row.weeklySalesCost.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                        <div className="text-xs text-[#071013]/50 flex items-center justify-end gap-1"><Package size={10}/> {row.weeklySalesUnits.toFixed(1)} units</div>
                                    </td>
                                    
                                    {/* Cover Status */}
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            row.currentCover > row.targetWeeks * 1.5 ? 'bg-[#D12323]/10 text-[#D12323]' :
                                            row.currentCover < row.targetWeeks * 0.8 ? 'bg-[#E9AD5D]/20 text-[#B47B2B]' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {row.currentCover > 52 ? '52+' : row.currentCover.toFixed(1)}
                                        </span>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-center text-[#071013]/60">{row.targetWeeks}</td>
                                    
                                    {/* Projections */}
                                    <td className="px-6 py-4 text-right bg-[#F9EFDD]/20 font-medium text-[#071013]/70">
                                        £{(row.weeklySalesCost * 4).toLocaleString(undefined, {maximumFractionDigits:0})}
                                    </td>
                                    <td className="px-6 py-4 text-right bg-[#F9EFDD]/20 font-medium text-[#071013]/70">
                                        £{row.projectedStock.toLocaleString(undefined, {maximumFractionDigits:0})}
                                        <div className="text-xs opacity-60">{Math.round(row.projectedStockUnits)} units</div>
                                    </td>
                                    
                                    {/* Intake Requirement (OTB) */}
                                    <td className="px-6 py-4 text-right font-bold text-[#778472]">
                                        <div>£{row.intakeReq.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                        <div className="text-xs text-[#778472]/70 flex items-center justify-end gap-1"><Package size={10}/> {Math.ceil(row.intakeReqUnits)} units</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <AiConsultantModal 
                isOpen={aiModalOpen} 
                onClose={() => setAiModalOpen(false)} 
                advice={aiAdvice} 
                isLoading={aiLoading} 
                title="WSSI Strategic Analysis" 
            />

            <WSSIDetailModal 
                isOpen={!!selectedWSSICategory}
                onClose={() => setSelectedWSSICategory(null)}
                categoryName={selectedWSSICategory}
                products={detailProducts}
            />
        </div>
    );
};

// 4. SYSTEM SETUP VIEW
const SystemSetup = () => {
    return (
  <div className="h-full overflow-auto bg-white rounded-xl border border-stone-200 p-8 pb-20">
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 rounded-xl text-purple-700">
           <Settings size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">System Setup Guide</h2>
          <p className="text-stone-500">How to build this tool in Google Sheets for free.</p>
        </div>
      </div>
      
      <div className="space-y-8">
        <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
          <div className="flex items-center gap-2 mb-4 text-green-700 font-bold uppercase text-xs tracking-wider">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} />
              <span>Step 1: The Stock Room (Inventory)</span>
            </div>
          </div>
          <h3 className="font-bold text-stone-900 mb-2">Create a tab named "Stock_Room"</h3>
          <p className="text-sm text-stone-600 mb-4">
            The foundational dataset for your Retail Command Centre. Ensure this tab contains the following headers in Row 1 to enable accurate data parsing.
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-white p-4 rounded-lg border border-stone-200 text-stone-600">
             <div className="p-2 bg-stone-50 rounded">A: SKU</div>
             <div className="p-2 bg-stone-50 rounded">B: Product Name</div>
             <div className="p-2 bg-stone-50 rounded">C: Category</div>
             <div className="p-2 bg-stone-50 rounded">D: Supplier</div>
             <div className="p-2 bg-stone-50 rounded">E: Cost Price</div>
             <div className="p-2 bg-stone-50 rounded">F: Selling Price</div>
             <div className="p-2 bg-stone-50 rounded">G: In Stock</div>
             <div className="p-2 bg-stone-50 rounded">H: Sold (30d)</div>
             <div className="p-2 bg-stone-50 rounded border-l-4 border-indigo-200">I: Target Weeks (Optional)</div>
          </div>
        </div>

        <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
          <div className="flex items-center gap-2 mb-4 text-blue-700 font-bold uppercase text-xs tracking-wider">
             <div className="flex items-center gap-2">
              <UploadCloud size={16} />
              <span>Step 2: WSSI Logic (Forward Planning)</span>
             </div>
          </div>
          <h3 className="font-bold text-stone-900 mb-2">Calculating Open-to-Buy (OTB)</h3>
          <p className="text-sm text-stone-600 mb-4">
            Extend your Stock_Room table by adding three specific columns to handle the forward-planning mathematics.
          </p>
          <div className="bg-white p-4 rounded-lg border border-stone-200 text-xs font-mono text-blue-600 break-all space-y-2">
            <p className="font-bold text-stone-800 border-b border-stone-100 pb-1">Column J: Weekly Sales Velocity</p>
            <p>=(H2/4)*E2</p>
            
            <p className="font-bold text-stone-800 border-b border-stone-100 pb-1 pt-2">Column K: Target Stock Valuation</p>
            <p>=J2*I2</p>
            
            <p className="font-bold text-stone-800 border-b border-stone-100 pb-1 pt-2">Column L: Intake Requirement</p>
            <p>=MAX(0, K2-( (G2*E2)-(J2*4) ))</p>
          </div>
        </div>

        <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
          <div className="flex items-center gap-2 mb-4 text-amber-700 font-bold uppercase text-xs tracking-wider">
             <div className="flex items-center gap-2">
              <Calculator size={16} />
              <span>Step 3: Category Benchmarks</span>
             </div>
          </div>
          <h3 className="font-bold text-stone-900 mb-2">UK Independent Retailer Targets</h3>
          <p className="text-sm text-stone-600 mb-4">
            Create a reference table or manually input these targets into **Column I** based on the category.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs bg-white p-4 rounded-lg border border-stone-200 text-stone-600">
             <div className="flex justify-between border-b border-stone-50 pb-1"><span>Jewellery & Watches</span> <span className="font-bold text-stone-900">33 Weeks</span></div>
             <div className="flex justify-between border-b border-stone-50 pb-1"><span>Furniture</span> <span className="font-bold text-stone-900">12 Weeks</span></div>
             <div className="flex justify-between border-b border-stone-50 pb-1"><span>Fashion & Footwear</span> <span className="font-bold text-stone-900">9 Weeks</span></div>
             <div className="flex justify-between border-b border-stone-50 pb-1"><span>Gifts & Homeware</span> <span className="font-bold text-stone-900">9 Weeks</span></div>
             <div className="flex justify-between border-b border-stone-50 pb-1"><span>Books & Stationery</span> <span className="font-bold text-stone-900">6 Weeks</span></div>
             <div className="flex justify-between border-b border-stone-50 pb-1"><span>General / Other</span> <span className="font-bold text-stone-900">10 Weeks</span></div>
          </div>
        </div>

        <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
          <div className="flex items-center gap-2 mb-4 text-purple-700 font-bold uppercase text-xs tracking-wider">
             <div className="flex items-center gap-2">
              <ListTodo size={16} />
              <span>Step 4: Automated Insights</span>
             </div>
          </div>
          <h3 className="font-bold text-stone-900 mb-2">The "Weekly Focus" Algorithm</h3>
          <p className="text-sm text-stone-600 mb-4">
            In **Column M**, paste this logic to auto-generate an action plan based on your inventory health.
          </p>
          <div className="bg-white p-4 rounded-lg border border-stone-200 text-xs font-mono text-purple-600 overflow-x-auto">
<pre>{`=IFS(
  AND(G2 > 20, H2 < 3), "Clearance Opportunity",
  AND(G2 < 10, H2 > 10), "Restock Alert",
  AND(((F2/1.2)-E2)/(F2/1.2) < 0.40, H2 > 5), "Profit Check",
  TRUE, "OK"
)`}</pre>
          </div>
        </div>

      </div>
    </div>
  </div>
);
};

// --- Main Layout ---

const App = () => {
  const [activeTab, setActiveTab] = useState('bigpicture');
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [globalChatOpen, setGlobalChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9EFDD] flex text-[#071013] font-sans selection:bg-[#E9AD5D] selection:text-white">
      {/* Fonts Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Poppins:wght@300;400;500;600;700&display=swap');
      `}</style>

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#778472] text-[#F9EFDD] flex flex-col fixed h-full z-20 shadow-xl font-['Poppins']">
        <div className="p-8 pb-4 border-b border-[#F9EFDD]/20">
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Caveat']">Retail Command<br/><span className="text-[#E9AD5D]">Centre</span></h1>
          <p className="text-xs text-[#F9EFDD]/70 mt-2 font-medium">Independent Retailer Edition</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('bigpicture')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'bigpicture' ? 'bg-[#F9EFDD] text-[#778472] shadow-lg transform scale-105' : 'text-[#F9EFDD]/70 hover:bg-[#F9EFDD]/10 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            The Big Picture
          </button>

          <button 
            onClick={() => setActiveTab('focus')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'focus' ? 'bg-[#F9EFDD] text-[#778472] shadow-lg transform scale-105' : 'text-[#F9EFDD]/70 hover:bg-[#F9EFDD]/10 hover:text-white'}`}
          >
            <ListTodo size={20} />
            Weekly Focus
          </button>

          <button 
            onClick={() => setActiveTab('wssi')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'wssi' ? 'bg-[#F9EFDD] text-[#778472] shadow-lg transform scale-105' : 'text-[#F9EFDD]/70 hover:bg-[#F9EFDD]/10 hover:text-white'}`}
          >
            <CalendarRange size={20} />
            WSSI Planner
          </button>

          <button 
            onClick={() => setActiveTab('stock')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'stock' ? 'bg-[#F9EFDD] text-[#778472] shadow-lg transform scale-105' : 'text-[#F9EFDD]/70 hover:bg-[#F9EFDD]/10 hover:text-white'}`}
          >
            <Store size={20} />
            The Stock Room
          </button>
          
          <div className="pt-6 mt-6 border-t border-[#F9EFDD]/20">
            <button 
              onClick={() => setActiveTab('setup')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'setup' ? 'text-[#E9AD5D] bg-[#F9EFDD]/10' : 'text-[#F9EFDD]/70 hover:bg-[#F9EFDD]/10 hover:text-white'}`}
            >
              <Settings size={20} />
              System Guide
            </button>
          </div>
        </nav>

        <div className="p-6 bg-[#071013]/20 m-4 rounded-xl border border-[#F9EFDD]/10">
          <div className="flex items-start gap-3 text-[#F9EFDD]/80 text-xs leading-relaxed">
            <HeartHandshake size={24} className="shrink-0 text-[#E9AD5D]" />
            <p>"Retail is detail, but don't forget to look up and smile at the customer."</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 md:p-12 h-screen overflow-hidden flex flex-col relative bg-[#F9EFDD] font-['Poppins']">
        <header className="flex justify-between items-center mb-8 shrink-0">
          <div>
             <h2 className="text-3xl font-extrabold text-[#071013] tracking-tight font-['Caveat']">
              {activeTab === 'stock' && "Manage Your Stock"}
              {activeTab === 'bigpicture' && "Your Shop's Pulse"}
              {activeTab === 'focus' && "This Week's Goals"}
              {activeTab === 'wssi' && "Forward Planning (WSSI)"}
              {activeTab === 'setup' && "Build It Yourself"}
            </h2>
            <p className="text-[#071013]/70 text-sm mt-1 font-medium">
               {activeTab === 'stock' && "Keep your inventory accurate to get the best advice."}
               {activeTab === 'bigpicture' && "A clear view of what's selling and what's sticking."}
               {activeTab === 'focus' && "Simple steps to improve your cash flow today."}
               {activeTab === 'wssi' && "Weekly Sales, Stock & Intake. Predict your future cash needs."}
               {activeTab === 'setup' && "Instructions to create this system in Google Sheets."}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-full shadow-sm border border-[#E9AD5D]/30 px-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-[#071013]">Keith's Demo Shop</p>
              <p className="text-[10px] text-[#778472] font-bold uppercase tracking-wider">Live</p>
            </div>
            <div className="h-10 w-10 bg-gradient-to-br from-[#778472] to-[#5f6a5a] rounded-full flex items-center justify-center text-white font-bold shadow-md">
              KS
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden rounded-2xl shadow-sm bg-white border border-[#E9AD5D]/20">
           {activeTab === 'stock' && <StockRoom inventory={inventory} setInventory={setInventory} />}
           {activeTab === 'bigpicture' && <BigPicture inventory={inventory} />}
           {activeTab === 'focus' && <WeeklyFocus inventory={inventory} />}
           {activeTab === 'wssi' && <WSSI inventory={inventory} />}
           {activeTab === 'setup' && <SystemSetup />}
        </div>
        
        {/* Persistent AI Chat Button */}
        <div className="fixed bottom-6 right-6 z-40">
           {!globalChatOpen && (
             <button 
               onClick={() => setGlobalChatOpen(true)}
               className="flex items-center gap-2 px-6 py-3 bg-[#778472] hover:bg-[#5f6a5a] text-white rounded-full shadow-xl transition-all hover:scale-105 font-bold font-['Caveat'] text-lg border-2 border-[#F9EFDD]"
             >
               <MessageSquare size={22} className="text-[#E9AD5D]" />
               Ask The Reluctant Retailer
             </button>
           )}
        </div>
        <GlobalChatbot isOpen={globalChatOpen} onClose={() => setGlobalChatOpen(false)} />

      </main>
    </div>
  );
};

export default App;
