import { createContext, useContext } from 'react';

/** Retained tab sessions stay in memory; hidden sessions cannot take focus. */
export const SessionVisibility = createContext(true);
export const useSessionVisible = () => useContext(SessionVisibility);
