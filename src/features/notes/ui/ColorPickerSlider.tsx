// src/features/notes/ui/ColorPickerSlider.tsx
import { hslToHex } from '@/features/notes/utils/notesUtils';
import React from 'react';

interface Props {
  color: string;
  onChange: (hex: string) => void;
}

export const ColorPickerSlider: React.FC<Props> = ({ color, onChange }) => {
  return (
    <div className="mt-4 w-full">
      <input
        type="range"
        min="0"
        max="360"
        onChange={(e) => {
          const hue = Number(e.target.value);
          onChange(hslToHex(hue, 80, 60)); // Насыщенные, но не вырвиглазные цвета
        }}
        className="h-3 w-full cursor-pointer appearance-none rounded-full outline-none"
        style={{
          background:
            'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
        }}
      />
      {/* Стили для ползунка берем из твоего VolumeSlider */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid white;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
