import { createContext, useContext } from 'react';

// Opt-in scope for compact node controls. Sheets restore the default density.
const ControlDensityContext = createContext<'default' | 'compact'>('default');
export const ControlDensityProvider = ControlDensityContext.Provider;
export const useCompactControls = () => useContext(ControlDensityContext) === 'compact';
