import { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHIAVE_MOTORE_MAPPA = "naturago_motore_mappa";
const PreferenzeContext = createContext(undefined);

export function PreferenzeProvider({ children }) {
  const [motoreMappa, setMotoreMappaState] = useState("apple");

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_MOTORE_MAPPA).then((valore) => {
      if (valore === "google" || valore === "apple") setMotoreMappaState(valore);
    });
  }, []);

  const setMotoreMappa = useCallback((valore) => {
    setMotoreMappaState(valore);
    AsyncStorage.setItem(CHIAVE_MOTORE_MAPPA, valore);
  }, []);

  return (
    <PreferenzeContext.Provider value={{ motoreMappa, setMotoreMappa }}>
      {children}
    </PreferenzeContext.Provider>
  );
}

export function usePreferenze() {
  return useContext(PreferenzeContext);
}
