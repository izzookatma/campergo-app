import * as Haptics from "expo-haptics";

// Piccole vibrazioni al tocco (iOS e Android). Mai bloccanti: se il
// dispositivo non le supporta, non succede nulla.
export const vibraLeggera = () => Haptics.selectionAsync().catch(() => {});
export const vibraConferma = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
