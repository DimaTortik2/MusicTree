import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { ColorPickerSlider } from './ColorPickerSlider';
import { Drop } from '@phosphor-icons/react';
import { isColorLight } from '@/features/notes/utils/notesUtils';
import { useNotesStore } from '../store/useNotesStore';

const PREDEFINED_COLORS = [
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#eab308',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (text: string, color: string) => void;
}

export const CreateNoteModal: React.FC<Props> = ({ isOpen, onClose, onApply }) => {
  const notes = useNotesStore((s) => s.notes);
  const [text, setText] = useState('');
  const [color, setColor] = useState('#ec4899');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText('');
      const usedColors = notes.map((n) => n.color);
      const available = PREDEFINED_COLORS.filter((c) => !usedColors.includes(c));
      setColor(
        available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)],
      );
    }
  }, [isOpen, notes]);

  // Логика авто-ресайза поля
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text, isOpen]);

  const isLight = isColorLight(color);
  const textColor = isLight ? '#0f0510' : '#ffffff';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      layout="vertical"
      className="!max-w-[500px] !bg-[#110815]"
    >
      <div className="flex flex-col">
        <h3 className="mb-4 text-sm text-text/60">Создание заметки для друзей</h3>

        <div className="relative mb-6">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) {
                  onApply(text.trim(), color);
                  onClose();
                }
              }
            }}
            placeholder="Очень важная заметка"
            autoFocus
            rows={1}
            className="w-full resize-none overflow-hidden border-b-2 bg-transparent pr-10 pb-2 text-2xl outline-none"
            style={{ color: '#fff', borderColor: color, minHeight: '44px' }}
          />
          <Drop size={24} weight="fill" className="absolute right-0 bottom-5" style={{ color }} />
        </div>

        <ColorPickerSlider color={color} onChange={setColor} />

        <div className="mt-8 flex gap-4">
          <Button
            variant="outline"
            color="text"
            className="flex-1 border-2 !bg-transparent opacity-80 hover:!bg-white/10 hover:opacity-100"
            style={{ borderColor: color, color: '#fff' }}
            onClick={onClose}
          >
            Отмена
          </Button>

          <Button
            variant="solid"
            className="flex-1 !border-transparent"
            disabled={!text.trim()}
            style={
              text.trim()
                ? { backgroundColor: color, color: textColor }
                : { backgroundColor: '#333', color: '#888' }
            }
            onClick={() => {
              if (text.trim()) {
                onApply(text.trim(), color);
                onClose();
              }
            }}
          >
            Применить
          </Button>
        </div>
      </div>
    </Modal>
  );
};
