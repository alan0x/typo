import React, { useState } from "react";
import { PolishResult } from "../services/gemini";
import { Bot, Copy, Check, CornerDownLeft, Sparkles, Lightbulb, MessageSquareQuote } from "lucide-react";

interface ResultCardProps {
  result: PolishResult;
  onReplace: (text: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onReplace }) => {
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copiedNatural, setCopiedNatural] = useState(false);

  const copyToClipboard = async (text: string, type: "agent" | "natural") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "agent") {
        setCopiedAgent(true);
        setTimeout(() => setCopiedAgent(false), 2000);
      } else {
        setCopiedNatural(true);
        setTimeout(() => setCopiedNatural(false), 2000);
      }
    } catch (err) {
      console.error("Clipboard copy error:", err);
    }
  };

  return (
    <div className="space-y-3.5 animate-fade-in select-text">
      {/* 1. Best for AI Agent (Primary Hero Card) */}
      <div className="p-3.5 bg-gradient-to-b from-indigo-950/40 to-zinc-900/60 border border-indigo-500/30 rounded-xl shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-500/10">
          <div className="flex items-center gap-1.5 text-indigo-400 font-medium text-xs">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Best for AI Agent (Claude / Cursor)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => copyToClipboard(result.bestForAgent, "agent")}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-md transition-colors border border-zinc-700/50"
              title="Copy to clipboard"
            >
              {copiedAgent ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={() => onReplace(result.bestForAgent)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-md shadow transition-all border border-indigo-400/30"
              title="Replace source selection in IDE/terminal and close"
            >
              <CornerDownLeft className="w-3 h-3" />
              <span>Replace (Enter)</span>
            </button>
          </div>
        </div>

        {/* Polished Prompt text */}
        <p className="mt-2.5 text-xs text-zinc-100 font-normal leading-relaxed selectable-text selection:bg-indigo-500/40">
          {result.bestForAgent}
        </p>

        {/* AI Agent Reasoning Tip */}
        {result.agentReasoning && (
          <div className="mt-2.5 pt-2 border-t border-indigo-500/15 flex items-start gap-1.5 text-[11px] text-indigo-300/90 leading-tight">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
            <span>{result.agentReasoning}</span>
          </div>
        )}
      </div>

      {/* 2. Natural English Version */}
      {result.naturalVersion && (
        <div className="p-3 bg-zinc-900/50 border border-zinc-800/70 rounded-xl">
          <div className="flex items-center justify-between pb-1.5">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
              <MessageSquareQuote className="w-3.5 h-3.5 text-zinc-400" />
              <span>Natural Idiomatic English</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => copyToClipboard(result.naturalVersion, "natural")}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              >
                {copiedNatural ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={() => onReplace(result.naturalVersion)}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                title="Replace selection with natural version"
              >
                <CornerDownLeft className="w-3 h-3" />
                <span>Replace</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed selectable-text selection:bg-indigo-500/40">
            {result.naturalVersion}
          </p>
        </div>
      )}

      {/* 3. Grammar & Spelling Diagnostic Breakdown */}
      {result.analysis && result.analysis.length > 0 && (
        <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>修改与语法分析对照 (Diagnostic Breakdown)</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800/80">
                  <th className="py-1.5 px-2.5 font-medium">原文 (Original)</th>
                  <th className="py-1.5 px-2.5 font-medium">问题说明 (Issue)</th>
                  <th className="py-1.5 px-2.5 font-medium">修改建议 (Suggestion)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {result.analysis.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-1.5 px-2.5 font-mono text-rose-300/90 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                        {item.original}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-zinc-300">{item.issue}</td>
                    <td className="py-1.5 px-2.5 font-mono text-emerald-300">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {item.suggestion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
