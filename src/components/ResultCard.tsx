import React, { useState } from "react";
import { PolishResult } from "../services/gemini";
import { Bot, Copy, Check, CornerDownLeft, Sparkles, Lightbulb, MessageCircle } from "lucide-react";

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
    <div className="space-y-3 animate-fade-in select-text">
      {/* 1. Best for AI Agent (Hero Card with Warm Glow) */}
      <div className="p-3.5 bg-gradient-to-b from-amber-950/20 via-stone-900/80 to-stone-900/90 border border-amber-500/30 rounded-2xl shadow-lg shadow-black/40 relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/15">
          <div className="flex items-center gap-1.5 text-amber-300 font-medium text-xs">
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>Optimal for AI Agent (Claude / Cursor)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => copyToClipboard(result.bestForAgent, "agent")}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-300 hover:text-stone-100 bg-stone-800/80 hover:bg-stone-700/80 rounded-xl transition-colors border border-stone-700/50"
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
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-medium text-stone-950 bg-amber-500 hover:bg-amber-400 active:scale-95 rounded-xl shadow-sm transition-all"
              title="Replace source selection in IDE/terminal and close"
            >
              <CornerDownLeft className="w-3 h-3" />
              <span>Replace (Enter)</span>
            </button>
          </div>
        </div>

        {/* Polished prompt string */}
        <p className="mt-2.5 text-xs text-stone-100 font-normal leading-relaxed selectable-text selection:bg-amber-500/30">
          {result.bestForAgent}
        </p>

        {/* Agent reasoning insight */}
        {result.agentReasoning && (
          <div className="mt-2.5 pt-2 border-t border-amber-500/15 flex items-start gap-1.5 text-[11px] text-amber-200/90 leading-relaxed">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
            <span>{result.agentReasoning}</span>
          </div>
        )}
      </div>

      {/* 2. Natural English Version */}
      {result.naturalVersion && (
        <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-2xl">
          <div className="flex items-center justify-between pb-1.5">
            <div className="flex items-center gap-1.5 text-stone-400 text-xs font-medium">
              <MessageCircle className="w-3.5 h-3.5 text-stone-400" />
              <span>Natural Idiomatic English</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => copyToClipboard(result.naturalVersion, "natural")}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
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
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
                title="Replace selection with natural version"
              >
                <CornerDownLeft className="w-3 h-3" />
                <span>Replace</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed selectable-text selection:bg-amber-500/30">
            {result.naturalVersion}
          </p>
        </div>
      )}

      {/* 3. Thoughtful Diagnostic Breakdown */}
      {result.analysis && result.analysis.length > 0 && (
        <div className="p-3 bg-stone-900/70 border border-stone-800/80 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-stone-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gentle Learning Breakdown (改进建议)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-800/80">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-stone-950/90 text-stone-400 border-b border-stone-800">
                  <th className="py-2 px-3 font-medium">原文 (Draft)</th>
                  <th className="py-2 px-3 font-medium">问题说明 (Why)</th>
                  <th className="py-2 px-3 font-medium">修改建议 (Suggestion)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {result.analysis.map((item, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/20 transition-colors">
                    <td className="py-2 px-3 font-mono text-rose-300/90 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                        {item.original}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-stone-300 leading-relaxed">{item.issue}</td>
                    <td className="py-2 px-3 font-mono text-emerald-300">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
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
