import React, { useState } from "react";
import { PolishResult } from "../services/gemini";
import { Check, CornerDownLeft, Copy, ArrowRight, Terminal } from "lucide-react";

interface ResultCardProps {
  result: PolishResult;
  onReplace: (text: string, deleteOriginal?: boolean) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onReplace }) => {
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copiedNatural, setCopiedNatural] = useState(false);

  const copyToClipboard = async (text: string, type: "agent" | "natural") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "agent") {
        setCopiedAgent(true);
        setTimeout(() => setCopiedAgent(false), 1800);
      } else {
        setCopiedNatural(true);
        setTimeout(() => setCopiedNatural(false), 1800);
      }
    } catch (err) {
      console.error("Clipboard copy error:", err);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in select-text text-stone-900">
      {/* 01. Primary: Optimized Agent Directive */}
      <section className="bg-white border border-stone-200/90 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="meta-caption text-stone-700">01 / Optimal For AI Agent</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(result.bestForAgent, "agent")}
              className="text-[11px] font-mono text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copiedAgent ? (
                <>
                  <Check className="w-3 h-3 text-stone-800" />
                  <span>Copied</span>
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
              className="px-2.5 py-1 text-[11px] font-sans font-medium text-stone-50 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Replace in editor</span>
              <CornerDownLeft className="w-2.5 h-2.5 text-stone-300" />
            </button>

            <button
              onClick={() => onReplace(result.bestForAgent, true)}
              title="Delete the original draft with Backspace, then paste. Use in terminals where selections cannot be overwritten."
              className="px-2.5 py-1 text-[11px] font-sans font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 active:scale-[0.98] rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Terminal className="w-3 h-3" />
              <span>⇧↵</span>
            </button>
          </div>
        </div>

        {/* Polished Prompt Content */}
        <p className="text-[13px] leading-relaxed text-stone-900 font-normal selectable-text">
          {result.bestForAgent}
        </p>

        {/* Editorial Marginal Note */}
        {result.agentReasoning && (
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-start gap-2 text-[11px] text-stone-600 leading-normal">
            <span className="font-serif italic text-stone-400 select-none">Obs.</span>
            <span className="font-sans">{result.agentReasoning}</span>
          </div>
        )}
      </section>

      {/* 02. Secondary: Natural Human Expression */}
      {result.naturalVersion && (
        <section className="bg-[#fcfbf9] border border-stone-200/70 rounded-xl p-3.5">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-200/40">
            <span className="meta-caption text-stone-400">02 / Casual & Peer Phrasing</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(result.naturalVersion, "natural")}
                className="text-[11px] font-mono text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                {copiedNatural ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => onReplace(result.naturalVersion)}
                className="text-[11px] font-sans text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Use this
              </button>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-stone-700 selectable-text">
            {result.naturalVersion}
          </p>
        </section>
      )}

      {/* 03. Proofreading Annotations */}
      {result.analysis && result.analysis.length > 0 && (
        <section className="pt-1">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="meta-caption text-stone-400">03 / Proofreading Notes</span>
            <div className="flex-1 h-px bg-stone-200/70" />
          </div>

          <div className="space-y-2">
            {result.analysis.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-white border border-stone-200/60 flex flex-col gap-1 text-[11px] transition-colors"
              >
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-stone-500 line-through decoration-stone-400/80">
                    {item.original}
                  </span>
                  <ArrowRight className="w-2.5 h-2.5 text-stone-300 shrink-0" />
                  <span className="font-semibold text-stone-900">
                    {item.suggestion}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-normal pl-0.5">
                  {item.issue}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
