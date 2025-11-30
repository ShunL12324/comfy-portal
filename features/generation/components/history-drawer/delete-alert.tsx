import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import React from 'react';

interface DeleteAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export const DeleteAlert = (props: DeleteAlertProps) => {
  return (
    <ConfirmDialog
      {...props}
      confirmText="Delete"
      confirmButtonColor="bg-error-500"
    />
  );
};
