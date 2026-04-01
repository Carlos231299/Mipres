import { useState } from 'react';
import { useWizard } from '../../context/WizardContext';
import { wizardToken } from '../../services/api';

export const Step1Token = () => {
  const { updateProcesoFromDb, isLoading, setIsLoading, setError, clearError } = useWizard();
  
  const [nit, setNit] = useState('57304482');
  const [tokenBase, setTokenBase] = useState('7619D137-4D48-4348-BA74-93A7A196F880');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');
    
    if (!nit || !tokenBase) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await wizardToken({ nit, tokenBase });
      
      // La respuesta del backend trae: ok, data: { proceso, tokenRaw }
      if (response.ok && response.data?.proceso) {
        setSuccessMsg('Token generado y proceso iniciado correctamente en la Base de Datos.');
        
        // Un pequeño timeout para que el usuario vea el mensaje de éxito antes de avanzar
        setTimeout(() => {
          updateProcesoFromDb(response.data.proceso);
        }, 1500);
      } else {
        setError('Respuesta inválida del servidor.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error desconocido al generar token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem' }}>Paso 1: Autenticación y Generación de Token</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Ingresa tu NIT y Token Base asignados por SISPRO. Esto iniciará el proceso 
        y guardará el token de sesión de forma segura para los siguientes pasos.
      </p>

      {successMsg && (
        <div className="alert" style={{ backgroundColor: '#ecfdf5', color: 'var(--success)', border: '1px solid #a7f3d0' }}>
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nit">NIT del Prestador:</label>
          <input
            id="nit"
            type="text"
            className="form-control"
            value={nit}
            onChange={(e) => setNit(e.target.value)}
            placeholder="Ej: 900123456"
            disabled={isLoading || !!successMsg}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tokenBase">Token Base (SISPRO):</label>
          <input
            id="tokenBase"
            type="password"
            className="form-control"
            value={tokenBase}
            onChange={(e) => setTokenBase(e.target.value)}
            placeholder="Ingresa tu token base..."
            disabled={isLoading || !!successMsg}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading || !!successMsg}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {isLoading ? 'Conectando con SISPRO...' : 'Generar Token e Iniciar'}
        </button>
      </form>
    </div>
  );
};
