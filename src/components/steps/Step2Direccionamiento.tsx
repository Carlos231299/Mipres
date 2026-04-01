import { useState } from 'react';
import { useWizard } from '../../context/WizardContext';
import { wizardVerificarDireccionamiento } from '../../services/api';

// Renombramos internamente aunque el archivo siga llamándose igual.
export const Step2Direccionamiento = () => {
  const { proceso, updateProcesoFromDb, isLoading, setIsLoading, setError, clearError, goBack } = useWizard();

  const [formData, setFormData] = useState({
    NoPrescripcion: ''
  });

  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    if (!proceso) {
      setError('No hay un proceso activo. Vuelve al Paso 1.');
      return;
    }

    if (!formData.NoPrescripcion.trim()) {
      setError('El Número de Prescripción es obligatorio.');
      return;
    }

    setIsLoading(true);
    try {
      // Llamamos a la nueva ruta en el backend
      const response = await wizardVerificarDireccionamiento(proceso.id_local, {
        NoPrescripcion: formData.NoPrescripcion
      });

      if (response.ok && response.data?.proceso) {
        setSuccessMsg(`¡Verificado con éxito! ID extraído: ${response.data.proceso.id_mipres}`);
        
        setTimeout(() => {
          updateProcesoFromDb(response.data.proceso);
        }, 2000);
      } else {
        setError('Respuesta inválida del servidor.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error desconocido al Consultar MIPRES');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Paso 2: Verificar Prescripción y Direccionamiento</h3>
        <button onClick={goBack} disabled={isLoading} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#e2e8f0', color: '#1e293b' }}>
          ← Regresar
        </button>
      </div>
      
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        El sistema verificará automáticamente en MIPRES si ya existe una entrega previa para esta prescripción. 
        Si no la hay, se extraerá el <strong>ID de Direccionamiento</strong> y los datos clínicos 
        directamente del servidor para que no debas digitarlos manualmente.
      </p>

      {successMsg && (
        <div className="alert" style={{ backgroundColor: '#ecfdf5', color: 'var(--success)', border: '1px solid #a7f3d0' }}>
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        
        <div className="form-group">
          <label htmlFor="tokenActivo">Token de Sesión (Generado en Paso 1):</label>
          <input
            id="tokenActivo"
            type="text"
            className="form-control"
            value={proceso?.token || ''}
            readOnly
            style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', fontSize: '0.8rem', color: '#64748b' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="NoPrescripcion">No. Prescripción (Direccionamiento):</label>
          <input
            id="NoPrescripcion"
            name="NoPrescripcion"
            type="text"
            className="form-control"
            value={formData.NoPrescripcion}
            onChange={handleChange}
            placeholder="Ej: 2024123456789"
            disabled={isLoading || !!successMsg}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading || !!successMsg}
          style={{ width: '100%' }}
        >
          {isLoading ? 'Consultando en SISPRO...' : 'Verificar y Extraer Direccionamiento'}
        </button>
      </form>
    </div>
  );
};
