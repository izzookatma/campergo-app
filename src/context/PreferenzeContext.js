import { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHIAVE_MOTORE_MAPPA = "naturago_motore_mappa";
const CHIAVE_MUSICA_GIOCHI = "naturago_musica_giochi";
const PreferenzeContext = createContext(undefined);

export function PreferenzeProvider({ children }) {
  const [motoreMappa, setMotoreMappaState] = useState("apple");
  const [musicaGiochiAttiva, setMusicaGiochiAttivaState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_MOTORE_MAPPA).then((valore) => {
      if (valore === "google" || valore === "apple") setMotoreMappaState(valore);
    });
    AsyncStorage.getItem(CHIAVE_MUSICA_GIOCHI).then((valore) => {
      if (valore === "no") setMusicaGiochiAttivaState(false);
    });
  }, []);

  const setMotoreMappa = useCallback((valore) => {
    setMotoreMappaState(valore);
    AsyncStorage.setItem(CHIAVE_MOTORE_MAPPA, valore);
  }, []);

  const setMusicaGiochiAttiva = useCallback((valore) => {
    setMusicaGiochiAttivaState(valore);
    AsyncStorage.setItem(CHIAVE_MUSICA_GIOCHI, valore ? "si" : "no");
  }, []);

  return (
    <PreferenzeContext.Provider
      value={{ motoreMappa, setMotoreMappa, musicaGiochiAttiva, setMusicaGiochiAttiva }}
    >
      {children}
    </PreferenzeContext.Provider>
  );
}

export function usePreferenze() {
  return useContext(PreferenzeContext);
}
