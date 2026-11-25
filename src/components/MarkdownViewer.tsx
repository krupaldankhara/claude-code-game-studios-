import { useMemo } from 'react';
import {
  parseMarkdownBlocks,
  type InlineSegment,
} from '../utils/markdownParser';

interface MarkdownViewerProps {
  content: string;
}

function renderSegments(segments: InlineSegment[]) {
  return segments.map((seg, idx) => {
    if (seg.type === 'strong') {
      return (
        <strong key={idx} className="font-semibold text-[#F3F6FC]">
          {seg.text}
        </strong>
      );
    }
    if (seg.type === 'code') {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[#181E2B] border border-[#262E40] font-mono text-[12px] text-[#F0B429]"
        >
          {seg.text}
        </code>
      );
    }
    return <span key={idx}>{seg.text}</span>;
  });
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className="space-y-4 text-sm text-[#CBD4E3] leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h2
                key={idx}
                className="font-display text-lg font-semibold text-[#F8FAFC] pt-1 pb-2 border-b border-[#1E2534]"
              >
                {renderSegments(block.segments)}
              </h2>
            );
          }
          if (block.level === 2) {
            return (
              <h3
                key={idx}
                className="font-display text-base font-semibold text-[#F3F6FC] pt-2"
              >
                {renderSegments(block.segments)}
              </h3>
            );
          }
          return (
            <h4
              key={idx}
              className="font-display text-sm font-semibold text-[#E6EAF2] pt-1"
            >
              {renderSegments(block.segments)}
            </h4>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="text-[#CBD4E3] leading-relaxed max-w-[72ch]">
              {renderSegments(block.segments)}
            </p>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={idx} className="space-y-1.5 list-disc pl-5 text-[#CBD4E3]">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderSegments(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={idx} className="space-y-1.5 list-decimal pl-5 text-[#CBD4E3]">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderSegments(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'codeblock') {
          return (
            <pre
              key={idx}
              className="p-3.5 rounded-lg bg-[#080B10] border border-[#1E2534] font-mono text-xs text-[#D5DCEA] overflow-x-auto leading-relaxed"
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        return <hr key={idx} className="border-[#1E2534]" />;
      })}
    </div>
  );
}
