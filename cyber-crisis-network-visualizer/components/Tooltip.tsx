import React from 'react';

interface TooltipProps {
    visible: boolean;
    content: string;
    x: number;
    y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ visible, content, x, y }) => {
    if (!visible) return null;

    const styleX = x + 15; 
    const styleY = y - 10; 

    return (
        <div
            className={`fixed bg-black/95 text-neutral-100 p-2.5 rounded-lg text-xs pointer-events-none shadow-xl border border-white/20 backdrop-blur-sm max-w-xs break-words z-[100] transition-opacity duration-100 ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
                left: `${styleX}px`, 
                top: `${styleY}px`,
                transform: 'translateY(-100%)' 
            }}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

export default Tooltip;