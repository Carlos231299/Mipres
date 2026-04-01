import { useState } from 'react';
import { useWizard } from '../../context/WizardContext';
import { wizardReporte } from '../../services/api';

export const Step5ReporteEntrega = () => {
  const { proceso, updateProcesoFromDb, isLoading, setIsLoading, setError, clearError, goBack } = useWizard();

  const [formData, setFormData] = useState({
    EstadoEntrega: '1',
    CausaNoEntrega: '0',
    ValorEntregado: ''
  });

  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    if (!proceso) {
      setError('Faltan datos base del proceso. Asegúrate de tener un direccionamiento.');
      return;
    }

    if (!formData.ValorEntregado.trim()) {
      setError('El valor entregado es obligatorio.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        EstadoEntrega: Number(formData.EstadoEntrega),
        CausaNoEntrega: formData.EstadoEntrega === '1' ? 0 : Number(formData.CausaNoEntrega),
        ValorEntregado: Number(formData.ValorEntregado)
      };

      const response = await wizardReporte(proceso.id_local, payload);

      if (response.ok && response.data?.proceso) {
        setSuccessMsg(`Reporte registrado con éxito. ID Reporte: ${response.data.proceso.id_reporte}. ¡PROCESO COMPLETADO!`);
        
        setTimeout(() => {
          updateProcesoFromDb(response.data.proceso);
        }, 3000);
      } else {
        setError('Respuesta inválida del servidor.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error desconocido al reportar entrega');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Paso 5: Reporte de Entrega</h3>
        {proceso?.estado !== 'REPORTADO' && (
          <button onClick={goBack} disabled={isLoading} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#e2e8f0', color: '#1e293b' }}>
            ← Regresar
          </button>
        )}
      </div>

      <div className="alert" style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <p style={{ margin: 0 }}>📌 <strong>ID Direccionamiento a referenciar:</strong> {proceso?.id_mipres || 'Ninguno'}</p>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Finaliza el proceso reportando el valor económico de lo entregado o los motivos de no entrega física.
      </p>

      {successMsg && (
        <div className="alert" style={{ backgroundColor: '#ecfdf5', color: 'var(--success)', border: '1px solid #a7f3d0' }}>
          ✨ {successMsg}
        </div>
      )}

      {proceso?.estado === 'REPORTADO' ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>¡Wizard Completado! 🎉</h2>
          <p>La información ha sido validada, entregada y reportada en SISPRO exitosamente.</p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'left' }}>
            <p><strong>ID Local:</strong> #{proceso.id_local}</p>
            <p><strong>ID Direccionamiento:</strong> {proceso.id_mipres}</p>
            <p><strong>ID Programación:</strong> {proceso.id_programacion}</p>
            <p><strong>ID Entrega:</strong> {proceso.id_entrega}</p>
            <p><strong>ID Reporte Final:</strong> {proceso.id_reporte}</p>
          </div>
          
          <button 
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => window.location.reload()}
          >
            Iniciar Nuevo Trámite
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          
          <div className="form-group">
            <label htmlFor="EstadoEntrega">Estado de la Entrega:</label>
            <select 
              id="EstadoEntrega" 
              name="EstadoEntrega" 
              className="form-control"
              value={formData.EstadoEntrega} 
              onChange={handleChange}
              disabled={isLoading || !!successMsg}
            >
              <option value="1">Entrega Efectiva (1)</option>
              <option value="0">No se entregó (0)</option>
            </select>
          </div>

          {formData.EstadoEntrega === '0' && (
            <div className="form-group">
              <label htmlFor="CausaNoEntrega">Causa Genérica de No Entrega:</label>
              <select 
                id="CausaNoEntrega" 
                name="CausaNoEntrega" 
                className="form-control"
                value={formData.CausaNoEntrega} 
                onChange={handleChange}
                disabled={isLoading || !!successMsg}
                required
              >
                <option value="0" disabled>Seleccione una causa...</option>
                <option value="1">1 - Paciente no asiste</option>
                <option value="2">2 - Falta de inventario / Stock</option>
                <option value="3">3 - Problemas de transporte / Logística</option>
                <option value="4">4 - Tecnología médica en mal estado</option>
                <option value="5">5 - Negativa del paciente a recibir</option>
                <option value="6">6 - Prescripción vencida</option>
                <option value="99">99 - Otras causas operativas</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="ValorEntregado">Valor Entregado (COP):</label>
            <input
              id="ValorEntregado"
              name="ValorEntregado"
              type="number"
              className="form-control"
              value={formData.ValorEntregado}
              onChange={handleChange}
              placeholder="Ej: 50000"
              disabled={isLoading || !!successMsg}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading || !!successMsg}
              style={{ width: '100%' }}
            >
              {isLoading ? 'Reportando a SISPRO...' : 'Finalizar y Reportar Entrega'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
