import { Check } from '@/constants/icons';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Title, Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
interface ConfirmDialogProps {
  isOpen: boolean;
  destructive?: boolean;
  loading?: boolean;
  completed?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'solid' | 'outline' | 'link';
}
export function ConfirmDialog({
  isOpen,
  destructive = false,
  loading = false,
  completed = false,
  error,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonVariant = 'solid',
}: ConfirmDialogProps) {
  const c = useDesign();
  const handleClose = () => { if (!loading) onClose(); };
  const confirm = <Action fill kind={confirmButtonVariant === 'solid' ? 'primary' : confirmButtonVariant === 'outline' ? 'secondary' : 'text'} icon={completed ? Check : undefined} destructive={destructive && !completed} loading={loading} disabled={loading || completed} onPress={onConfirm}>{confirmText}</Action>;
  return (
    <AlertDialog isOpen={isOpen} onClose={handleClose}>
      <AlertDialogBackdrop onPress={handleClose} />
      <AlertDialogContent
        style={{ padding: t.layout.inset, borderRadius: t.radius.panel, borderWidth: 1, borderColor: c.line, backgroundColor: c.overlay }}
      >
        <AlertDialogHeader>
          <Title compact>{title}</Title>
        </AlertDialogHeader>
        <AlertDialogBody>
          <Copy muted>{description}</Copy>
          {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
        </AlertDialogBody>
        <AlertDialogFooter style={{ flexDirection: 'column', gap: t.layout.related, alignItems: 'stretch' }}>
          {confirm}
          <Action kind="secondary" fill disabled={loading} onPress={handleClose}>{cancelText}</Action>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
