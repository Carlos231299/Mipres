import { useState } from 'react';
import { useWizard } from '../context/WizardContext';
import { Stepper } from './Stepper';
import { Step1Token } from './steps/Step1Token';
import { Step2Direccionamiento } from './steps/Step2Direccionamiento';
import { Step3Programacion } from './steps/Step3Programacion';
import { Step4Entrega } from './steps/Step4Entrega';
import { Step5ReporteEntrega } from './steps/Step5ReporteEntrega';
import { getProceso } from '../services/api';

export const WizardContainer = () => {
  const { currentStep, error, proceso, updateProcesoFromDb, clearError, setError } = useWizard();
  
  const [loadId, setLoadId] = useState('');
  const [isResuming, setIsResuming] = useState(false);

  const handleResume = async () => {
    if (!loadId) return;
    setIsResuming(true);
    clearError();
    try {
      const data = await getProceso(Number(loadId));
      if (data.ok && data.data) {
        updateProcesoFromDb(data.data);
      } else {
        setError('Proceso no encontrado.');
      }
    } catch (err) {
      setError('Error al cargar proceso.');
    } finally {
      setIsResuming(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Token />;
      case 2:
        return <Step2Direccionamiento />;
      case 3:
        return <Step3Programacion />;
      case 4:
        return <Step4Entrega />;
      case 5:
        return <Step5ReporteEntrega />;
      default:
        return <div>Wizard completado.</div>;
    }
  };

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>MIPRES Integración Wizard</h2>
        
        {proceso ? (
          <div style={{ fontSize: '0.8rem', background: 'var(--border)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            Proceso Local #{proceso.id_local}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="number" 
              placeholder="Resumir ID..." 
              style={{ width: '100px', padding: '0.3rem' }} 
              value={loadId} 
              onChange={e => setLoadId(e.target.value)} 
            />
            <button onClick={handleResume} disabled={isResuming || !loadId} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Cargar</button>
          </div>
        )}
      </div>
      
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Sistema paso a paso conectando con la API de SISPRO.
      </p>
      
      <Stepper />

      {error && (
        <div className="alert alert-error">
          <strong>Error: </strong> {error}
        </div>
      )}

      <div className="card">
        {renderCurrentStep()}
      </div>
    </div>
  );
};
