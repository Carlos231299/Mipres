import { useState } from 'react';
import { useWizard } from '../../context/WizardContext';
import { wizardEntrega } from '../../services/api';

export const Step4Entrega = () => {
  const { proceso, updateProcesoFromDb, isLoading, setIsLoading, setError, clearError, goBack } = useWizard();

  const [formData, setFormData] = useState({
    CantTotEntregada: proceso?.cant_tot_a_entregar?.toString() || '',
    EntTotal: '1',
    FecEntrega: '',
    TipoIDRecibe: 'CC',
    NoIDRecibe: ''
  });

  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    if (!proceso || !proceso.id_mipres) {
      setError('Faltan IDs previos. Asegúrate de tener al menos un Direccionamiento activo.');
      return;
    }

    if (Object.values(formData).some((v) => v.trim() === '')) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        CantTotEntregada: Number(formData.CantTotEntregada),
        EntTotal: Number(formData.EntTotal)
      };

      const response = await wizardEntrega(proceso.id_local, payload);

      if (response.ok && response.data?.proceso) {
        setSuccessMsg(`Entrega registrada. ID devuelto: ${response.data.proceso.id_entrega}`);

        setTimeout(() => {
          updateProcesoFromDb(response.data.proceso);
        }, 2000);
      } else {
        setError('Respuesta inválida del servidor.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error desconocido al registrar la Entrega');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Paso 4: Entrega</h3>
        <button onClick={goBack} disabled={isLoading} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#e2e8f0', color: '#1e293b' }}>
          ← Regresar
        </button>
      </div>

      <div className="alert" style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>📌 <strong>ID Direccionamiento a referenciar:</strong> {proceso?.id_mipres || 'Ninguno'}</p>
        <p style={{ margin: 0 }}>Recuerda verificar bien las cantidades antes de confirmar.</p>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Registra la entrega física realizada. El sistema inyectará automáticamente los IDs de Direccionamiento
        y Programación, así como el código de TEC: <strong>{proceso?.cod_ser_tec_a_entregar}</strong>.
      </p>

      {successMsg && (
        <div className="alert" style={{ backgroundColor: '#ecfdf5', color: 'var(--success)', border: '1px solid #a7f3d0' }}>
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>

        <div className="form-group">
          <label htmlFor="CantTotEntregada">Cantidad Total Entregada:</label>
          <input
            id="CantTotEntregada"
            name="CantTotEntregada"
            type="number"
            className="form-control"
            value={formData.CantTotEntregada}
            onChange={handleChange}
            readOnly
            style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="EntTotal">¿Entrega Total?</label>
          <select
            id="EntTotal"
            name="EntTotal"
            className="form-control"
            value={formData.EntTotal}
            onChange={handleChange}
            disabled={isLoading || !!successMsg}
          >
            <option value="1">Sí (1)</option>
            <option value="0">No (0)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="TipoIDRecibe">Tipo ID Quién Recibe:</label>
          <select
            id="TipoIDRecibe"
            name="TipoIDRecibe"
            className="form-control"
            value={formData.TipoIDRecibe}
            onChange={handleChange}
            disabled={isLoading || !!successMsg}
          >
            <option value="CC">Cédula (CC)</option>
            <option value="CE">Cédula Extranjería (CE)</option>
            <option value="PA">Pasaporte (PA)</option>
            <option value="TI">Tarjeta Identidad (TI)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="NoIDRecibe">No. ID Quién Recibe:</label>
          <input
            id="NoIDRecibe"
            name="NoIDRecibe"
            type="text"
            className="form-control"
            value={formData.NoIDRecibe}
            onChange={handleChange}
            placeholder="Documento"
            disabled={isLoading || !!successMsg}
          />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="FecEntrega">Fecha de Entrega Efectiva:</label>
          <input
            id="FecEntrega"
            name="FecEntrega"
            type="date"
            className="form-control"
            value={formData.FecEntrega}
            onChange={handleChange}
            disabled={isLoading || !!successMsg}
          />
        </div>

        <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !!successMsg}
            style={{ width: '100%' }}
          >
            {isLoading ? 'Enviando a SISPRO...' : 'Confirmar Entrega'}
          </button>
        </div>
      </form>
    </div>
  );
};
