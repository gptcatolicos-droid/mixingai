
import React from 'react';
import Button from '../base/Button';

interface MixPresetsProps {
  currentPreset: 'custom' | 'pop' | 'rock' | 'lofi';
  onPresetChange: (preset: 'pop' | 'rock' | 'lofi') => void;
  bassGain: number;
  midGain: number;
  highGain: number;
}

const MixPresets: React.FC<MixPresetsProps> = ({
  currentPreset,
  onPresetChange,
  bassGain,
  midGain,
  highGain
}) => {
  // CORREGIDO: Validar que los valores siempre sean números válidos
  const safeBassGain = typeof bassGain === 'number' && !isNaN(bassGain) ? bassGain : 0;
  const safeMidGain = typeof midGain === 'number' && !isNaN(midGain) ? midGain : 0;
  const safeHighGain = typeof highGain === 'number' && !isNaN(highGain) ? highGain : 0;

  const presets = [
    {
      id: 'pop' as const,
      name: 'Pop',
      description: 'Mezcla brillante y moderna',
      icon: 'ri-mic-line',
      color: 'from-pink-500 to-rose-500',
      settings: { bass: 2, mid: 1, high: 3 }
    },
    {
      id: 'rock' as const,
      name: 'Rock',
      description: 'Potencia y presencia',
      icon: 'ri-guitar-line',
      color: 'from-red-500 to-orange-500',
      settings: { bass: 4, mid: -1, high: 2 }
    },
    {
      id: 'lofi' as const,
      name: 'Lo-Fi',
      description: 'Sonido cálido y vintage',
      icon: 'ri-vinyl-line',
      color: 'from-amber-500 to-yellow-500',
      settings: { bass: 1, mid: -2, high: -4 }
    }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          Plantillas de Mezcla
        </h3>
        <div className="text-xs font-bold px-3 py-2 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          {currentPreset === 'custom' ? 'Personalizado' : (currentPreset ? currentPreset.toUpperCase() : 'CUSTOM')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {presets.map((preset) => {
          const isActive = currentPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onPresetChange(preset.id)}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left hover:scale-105 ${
                isActive
                  ? 'border-blue-500 bg-blue-50/50 shadow-lg'
                  : 'border-gray-200/50 bg-gray-50/30 hover:border-gray-300/70 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${preset.color} flex items-center justify-center shadow-lg`}>
                  <i className={`${preset.icon} text-white text-xl`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {preset.name}
                  </h4>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {preset.description}
                  </p>
                </div>
              </div>

              {/* Configuración del preset */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Bass</div>
                  <div className={`text-sm font-bold ${preset.settings.bass > 0 ? 'text-green-600' : preset.settings.bass < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {preset.settings.bass > 0 ? '+' : ''}{preset.settings.bass} dB
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Mid</div>
                  <div className={`text-sm font-bold ${preset.settings.mid > 0 ? 'text-green-600' : preset.settings.mid < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {preset.settings.mid > 0 ? '+' : ''}{preset.settings.mid} dB
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">High</div>
                  <div className={`text-sm font-bold ${preset.settings.high > 0 ? 'text-green-600' : preset.settings.high < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {preset.settings.high > 0 ? '+' : ''}{preset.settings.high} dB
                  </div>
                </div>
              </div>

              {isActive && (
                <div className="mt-3 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="ml-2 text-xs text-blue-600 font-medium">Activo</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Configuración actual */}
      <div className="bg-gradient-to-r from-gray-100/50 to-gray-50/50 rounded-2xl p-4 border border-gray-200/30">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            Configuración Actual
          </h4>
          <div className="text-xs text-gray-500">
            {currentPreset === 'custom' ? 'Personalizado' : (currentPreset ? `Preset: ${currentPreset.toUpperCase()}` : 'Personalizado')}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1 font-medium">BASS</div>
            <div className={`text-lg font-bold ${safeBassGain > 0 ? 'text-green-600' : safeBassGain < 0 ? 'text-red-600' : 'text-gray-600'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {safeBassGain > 0 ? '+' : ''}{safeBassGain.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">dB</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1 font-medium">MID</div>
            <div className={`text-lg font-bold ${safeMidGain > 0 ? 'text-green-600' : safeMidGain < 0 ? 'text-red-600' : 'text-gray-600'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {safeMidGain > 0 ? '+' : ''}{safeMidGain.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">dB</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1 font-medium">HIGH</div>
            <div className={`text-lg font-bold ${safeHighGain > 0 ? 'text-green-600' : safeHighGain < 0 ? 'text-red-600' : 'text-gray-600'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {safeHighGain > 0 ? '+' : ''}{safeHighGain.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">dB</div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <i className="ri-lightbulb-line text-blue-500 text-lg mt-1"></i>
          <div>
            <h5 className="font-semibold text-gray-900 text-sm mb-1">💡 Consejo Profesional</h5>
            <p className="text-gray-700 text-sm leading-relaxed">
              Las plantillas son puntos de partida ideales. Puedes aplicar un preset y luego ajustar manualmente para obtener el sonido perfecto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MixPresets;
