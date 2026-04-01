import { useState } from 'react';

export const BatchMIPRES = () => {
  const [file, setFile] = useState<File | null>(null);
  const [nit, setNit] = useState('57304482'); // Quemado por defecto según entorno actual
  const [tokenBase, setTokenBase] = useState('7619D137-4D48-4348-BA74-93A7A196F880'); // Quemado por defecto
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecciona un archivo Excel (.xlsx)');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('nit', nit);
    formData.append('tokenBase', tokenBase);

    try {
      // 1. Enviar el archivo
      const response = await fetch('http://localhost:3001/api/batch/excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Podría ser un error de validación inicial devuelto como JSON
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Error reportado por el servidor al procesar el Excel.');
      }

      // 2. Recibir Blob Binario de Excel
      const rawBlob = await response.blob();
      const url = window.URL.createObjectURL(rawBlob);

      // 3. Forzar descarga automática del archivo con fecha legible y AM/PM
      const now = new Date();
      const hours24 = now.getHours();
      const ampm = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 % 12 || 12;
      const minutes = now.getMinutes().toString().padStart(2, '0');
      
      // Formato: YYYY-MM-DD_H-mm-AM-PM
      const datePart = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      const timePart = `${hours12}-${minutes}${ampm}`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resultado_Masivo_MIPRES_${datePart}_${timePart}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('¡Proceso Masivo finalizado exitosamente! Revisa el Excel descargado para ver el reporte médico inyectado con IDs finales.');
      setFile(null); // Reiniciar el input si se desea
    } catch (err: any) {
      setError(err.message || 'Error desconocido al procesar el archivo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
      <h2 style={{ marginBottom: '1rem', color: '#1e293b' }}>Carga Masiva (Excel a SISPRO) ⚡</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Sube el reporte de entregas en formato <strong>.xlsx</strong>. El sistema mapeará las columnas "N° MIPRES", "CODIGO TEC", cantidades y "VR TOTAL", ejecutando automáticamente los pasos de Programación, Entrega y Reporte Financiero para cada fila.
      </p>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '4px', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '4px', marginBottom: '1.5rem' }}>
          <strong>Éxito:</strong> {success}
        </div>
      )}

      <form onSubmit={handleUpload}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>NIT:</label>
            <input 
              type="text" 
              value={nit} 
              onChange={(e) => setNit(e.target.value)} 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              readOnly={isLoading}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Token Base:</label>
            <input 
              type="password" 
              value={tokenBase} 
              onChange={(e) => setTokenBase(e.target.value)} 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              readOnly={isLoading}
            />
          </div>
        </div>

        <div style={{ padding: '2rem', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', marginBottom: '1.5rem', background: '#f8fafc' }}>
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Haz clic para seleccionar el archivo Excel (.xlsx)</strong>
            <span style={{ color: '#64748b' }}>{file ? file.name : 'Ningún archivo seleccionado'}</span>
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleFileChange} 
              style={{ display: 'none' }}
              disabled={isLoading}
            />
          </label>
        </div>

        <button 
          type="submit" 
          disabled={!file || isLoading}
          style={{
            width: '100%',
            padding: '1rem',
            background: (file && !isLoading) ? '#2563eb' : '#94a3b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: (file && !isLoading) ? 'pointer' : 'not-allowed',
            transition: 'background 0.3s'
          }}
        >
          {isLoading ? 'Procesando Filas vía SISPRO (Esto tomará tiempo)...' : 'Subir e Iniciar Procesamiento Masivo'}
        </button>
      </form>
    </div>
  );
};
