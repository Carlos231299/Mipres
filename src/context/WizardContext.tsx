import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { ESTADO_A_PASO } from '../types/mipres';
import type { Proceso } from '../types/mipres';

interface WizardContextType {
  proceso: Proceso | null;
  setProceso: (proceso: Proceso | null) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  updateProcesoFromDb: (nuevoProceso: Proceso) => void;
  goBack: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const updateProcesoFromDb = (nuevoProceso: Proceso) => {
    setProceso(nuevoProceso);
    // Autonavega al siguiente paso correspondiente
    const pasoCompletado = ESTADO_A_PASO[nuevoProceso.estado];
    // Si completó el paso 1 (INICIADO), va al 2. 
    // Máximo paso: 5.
    const siguientePaso = Math.min(pasoCompletado + 1, 5);
    setCurrentStep(siguientePaso);
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <WizardContext.Provider
      value={{
        proceso,
        setProceso,
        currentStep,
        setCurrentStep,
        isLoading,
        setIsLoading,
        error,
        setError,
        clearError,
        updateProcesoFromDb,
        goBack,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};
