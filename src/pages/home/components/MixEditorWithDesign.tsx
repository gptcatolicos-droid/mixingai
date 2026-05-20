import { useState } from 'react';
import { MixerHeader } from './MixerHeader';
import MixEditor, { MixEditorProps } from './MixEditor';

interface MixEditorWithDesignProps extends Omit<MixEditorProps, 'onNavigate'> {}

export default function MixEditorWithDesign(props: MixEditorWithDesignProps) {
  const [stems, setStems] = useState(props.uploadedFiles.length);
  const [duration, setDuration] = useState('0:00');
  const [preset, setPreset] = useState(props.initialPreset?.name || 'Pop');

  const handleExport = (data: any) => {
    props.onExport(data);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0612 0%, #0F0A1A 100%)',
      padding: '20px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#F8F0FF',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <MixerHeader
          stems={stems}
          duration={duration}
          preset={preset}
          onExport={() => {}}
          onBack={props.onBack}
          disabled={stems === 0}
        />

        <div style={{
          background: 'rgba(26,16,40,0.5)',
          border: '1px solid rgba(192,38,211,0.15)',
          borderRadius: '16px',
          padding: '24px',
          backdropFilter: 'blur(10px)',
        }}>
          <MixEditor
            {...props}
            onExport={handleExport}
          />
        </div>
      </div>
    </div>
  );
}
