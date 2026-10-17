import React from 'react';
import { db, auth } from './firebase';
import { OperationType } from '../types';
import { toast } from 'sonner';

/**
 * In-app confirmation replacing window.confirm(): stays inside the app's
 * design and gives the user a cancel button.
 */
export const confirmAsync = (message: string, confirmLabel = 'Confirmer'): Promise<boolean> =>
  new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    toast.warning(message, {
      duration: 20000,
      action: { label: confirmLabel, onClick: () => settle(true) },
      cancel: { label: 'Annuler', onClick: () => settle(false) },
      onDismiss: () => settle(false),
    });
  });

export const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};
