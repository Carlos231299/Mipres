import { useState } from 'react';
import { WizardContainer } from './components/WizardContainer'
import { BatchMIPRES } from './components/BatchMIPRES'

function App() {
  const [mode, setMode] = useState<'wizard' | 'batch'>('wizard');

  return (
    <>
      <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <button 
          onClick={() => setMode('wizard')} 
          style={{ padding: '0.8rem 1.5rem', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #cbd5e1', marginRight: '1rem', background: mode === 'wizard' ? '#2563eb' : 'white', color: mode === 'wizard' ? 'white' : '#1e293b' }}
        >
          🧑‍⚕️ Asistente Paso a Paso (Wizard)
        </button>
        <button 
          onClick={() => setMode('batch')} 
          style={{ padding: '0.8rem 1.5rem', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #cbd5e1', background: mode === 'batch' ? '#2563eb' : 'white', color: mode === 'batch' ? 'white' : '#1e293b' }}
        >
          📁 Carga Masiva (Excel)
        </button>
      </div>

      {mode === 'wizard' ? <WizardContainer /> : <BatchMIPRES />}
    </>
  )
}

export default App
