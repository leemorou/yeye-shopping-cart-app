// src/components/RichTextEditor.jsx
import React, { useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Type, Link as LinkIcon 
} from 'lucide-react';

const RichTextEditor = ({ initialContent, onChange }) => {
  const contentRef = useRef(null);

  // ★ 關鍵修正：透過 useEffect 來管理內容更新
  // 這樣可以避免 React 在每次您打字 (State 更新) 時強制重繪 DOM，導致游標亂跳
  useEffect(() => {
    if (contentRef.current) {
        // 邏輯：只有當「外部傳入的新內容」跟「編輯器現在顯示的內容」不一樣時，才去改 HTML。
        // 當您自己在打字時，這兩者是一樣的，所以不會觸發重繪，游標就不會動了！
        if (contentRef.current.innerHTML !== initialContent) {
            contentRef.current.innerHTML = initialContent;
        }
    }
  }, [initialContent]);

  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Blue', value: '#3B82F6' },
  ];

  const ToolbarBtn = ({ onClick, title, children }) => (
    <button 
      type="button"
      onClick={onClick} 
      title={title}
      className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="border-2 border-slate-900 rounded-lg overflow-hidden flex flex-col h-64 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b-2 border-slate-900 p-2 flex flex-wrap gap-1 items-center">
        {/* Basic Styles */}
        <div className="flex gap-0.5 border-r border-slate-300 pr-1.5 mr-1.5">
          <ToolbarBtn onClick={() => execCmd('bold')} title="粗體"><Bold size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('italic')} title="斜體"><Italic size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('underline')} title="底線"><Underline size={14} /></ToolbarBtn>
        </div>

        {/* Alignment */}
        <div className="flex gap-0.5 border-r border-slate-300 pr-1.5 mr-1.5">
          <ToolbarBtn onClick={() => execCmd('justifyLeft')} title="靠左"><AlignLeft size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('justifyCenter')} title="居中"><AlignCenter size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('justifyRight')} title="靠右"><AlignRight size={14} /></ToolbarBtn>
        </div>

        {/* Size */}
        <div className="flex gap-0.5 border-r border-slate-300 pr-1.5 mr-1.5">
           <ToolbarBtn onClick={() => execCmd('fontSize', '5')} title="大標題"><Type size={16} /></ToolbarBtn>
           <ToolbarBtn onClick={() => execCmd('fontSize', '3')} title="一般"><Type size={12} /></ToolbarBtn>
           <ToolbarBtn onClick={() => execCmd('fontSize', '1')} title="小字"><Type size={10} /></ToolbarBtn>
        </div>

        {/* Color */}
        <div className="flex gap-0.5 border-r border-slate-300 pr-1.5 mr-1.5">
           {colors.map(c => (
             <button
               key={c.value}
               type="button"
               onClick={() => execCmd('foreColor', c.value)}
               className="w-5 h-5 rounded border border-slate-300 hover:scale-110 transition-transform"
               style={{ backgroundColor: c.value }}
               title={c.name}
             />
           ))}
        </div>

        {/* Link */}
        <ToolbarBtn onClick={() => {
           const url = prompt('請輸入連結網址:', 'http://');
           if (url) execCmd('createLink', url);
        }} title="插入連結"><LinkIcon size={14} /></ToolbarBtn>

      </div>
      
      {/* Editable Area */}
      <div
        className="flex-1 p-4 focus:outline-none overflow-y-auto prose prose-slate prose-sm max-w-none"
        contentEditable
        suppressContentEditableWarning={true}
        ref={contentRef}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        // ★ 注意：這裡移除了 dangerouslySetInnerHTML，改由上面的 useEffect 控制
      />
    </div>
  );
};

export default RichTextEditor;