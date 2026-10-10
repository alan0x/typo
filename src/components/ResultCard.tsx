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
      {/* 1. Best for AI Agent (Warm Honey Golden Card) */}
      <div className="p-3.5 bg-gradient-to-b from-amber-50/80 via-white to-white border border-amber-300/80 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
          <div className="flex items-center gap-1.5 text-amber-800 font-medium text-xs">
            <Bot className="w-3.5 h-3.5 text-amber-600" />
            <span>Optimal for AI Agent (Claude / Cursor)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => copyToClipboard(result.bestForAgent, "agent")}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 rounded-xl transition-colors border border-stone-200 shadow-2xs"
              title="Copy to clipboard"
            >
              {copiedAgent ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
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
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-medium text-stone-950 bg-amber-500 hover:bg-amber-400 active:scale-95 rounded-xl shadow-xs transition-all border border-amber-600/20"
              title="Replace source selection in IDE/terminal and close"
            >
              <CornerDownLeft className="w-3 h-3" />
              <span>Replace (Enter)</span>
            </button>
          </div>
        </div>

        {/* Polished prompt string */}
        <p className="mt-2.5 text-xs text-stone-850 font-normal leading-relaxed selectable-text selection:bg-amber-200 selection:text-amber-950">
          {result.bestForAgent}
        </p>

        {/* Agent reasoning insight */}
        {result.agentReasoning && (
          <div className="mt-2.5 pt-2 border-t border-amber-200/50 flex items-start gap-1.5 text-[11px] text-amber-900/90 leading-relaxed bg-amber-50/50 rounded-lg p-2">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
            <span>{result.agentReasoning}</span>
          </div>
        )}
      </div>

      {/* 2. Natural English Version */}
      {result.naturalVersion && (
        <div className="p-3 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
            <div className="flex items-center gap-1.5 text-stone-600 text-xs font-medium">
              <MessageCircle className="w-3.5 h-3.5 text-stone-500" />
              <span>Natural Idiomatic English</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => copyToClipboard(result.naturalVersion, "natural")}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
              >
                {copiedNatural ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
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
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                title="Replace selection with natural version"
              >
                <CornerDownLeft className="w-3 h-3" />
                <span>Replace</span>
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-800 leading-relaxed selectable-text selection:bg-amber-200 selection:text-amber-950">
            {result.naturalVersion}
          </p>
        </div>
      )}

      {/* 3. Thoughtful Diagnostic Breakdown */}
      {result.analysis && result.analysis.length > 0 && (
        <div className="p-3 bg-white border border-stone-200/90 rounded-2xl text-xs space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 text-stone-800 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Gentle Learning Breakdown (改进建议)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-stone-100/80 text-stone-600 border-b border-stone-200">
                  <th className="py-2 px-3 font-medium">原文 (Draft)</th>
                  <th className="py-2 px-3 font-medium">问题说明 (Why)</th>
                  <th className="py-2 px-3 font-medium">修改建议 (Suggestion)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {result.analysis.map((item, idx) => (
                  <tr key={idx} className="hover:bg-stone-50 transition-colors">
                    <td className="py-2 px-3 font-mono whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80">
                        {item.original}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-stone-700 leading-relaxed">{item.issue}</td>
                    <td className="py-2 px-3 font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
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
