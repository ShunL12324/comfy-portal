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
import { View } from '@/components/ui/view';
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
  const confirm = (
    <Action
      fill
      kind={confirmButtonVariant === 'solid' ? 'primary' : confirmButtonVariant === 'outline' ? 'secondary' : 'text'}
      icon={completed ? Check : undefined}
      destructive={destructive && !completed}
      loading={loading}
      disabled={loading || completed}
      onPress={onConfirm}
    >
      {confirmText}
    </Action>
  );
  return (
    <AlertDialog isOpen={isOpen} onClose={handleClose}>
      <AlertDialogBackdrop onPress={handleClose} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <Title compact>{title}</Title>
        </AlertDialogHeader>
        <AlertDialogBody style={{ marginTop: t.layout.related }} contentContainerStyle={{ gap: t.layout.related }}>
          <Copy muted>{description}</Copy>
          {!!error && (
            <Copy accessibilityRole="alert" style={{ color: c.danger }}>
              {error}
            </Copy>
          )}
        </AlertDialogBody>
        {/* Same order as sheet footers: Cancel, then the action. */}
        <AlertDialogFooter style={{ marginTop: t.layout.section }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Action kind="secondary" fill disabled={loading} onPress={handleClose}>
              {cancelText}
            </Action>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>{confirm}</View>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
