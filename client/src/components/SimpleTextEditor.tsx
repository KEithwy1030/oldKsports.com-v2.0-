import React from 'react';

interface SimpleTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const SimpleTextEditor: React.FC<SimpleTextEditorProps> = ({
  value,
  onChange,
  placeholder = "分享你的想法...",
  rows = 6,
  className = ""
}) => {
  return (
    <div className={className}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
      />
    </div>
  );
};

export default SimpleTextEditor;
