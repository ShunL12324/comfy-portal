import { Check } from '@/constants/icons';
import { Sheet } from '@/components/ui/design-system/overlays';
import { Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
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
/**
 * A confirmation, presented as a sheet. It is pushed onto the sheet stack, so
 * confirming from inside another sheet keeps that sheet underneath and returns
 * to it on Cancel. It cannot be dismissed while the action runs.
 */
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
  const handleClose = () => {
    if (!loading) onClose();
  };
  return (
    <Sheet open={isOpen} onClose={handleClose} title={title} compactTitle stackBehavior="push" dismissible={!loading}>
      <Copy muted>{description}</Copy>
      {!!error && (
        <Copy accessibilityRole="alert" style={{ color: c.danger }}>
          {error}
        </Copy>
      )}
      {/* Same order as sheet footers: Cancel, then the action. */}
      <View style={{ flexDirection: 'row', gap: t.layout.related, paddingTop: t.layout.related }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Action kind="secondary" fill disabled={loading} onPress={handleClose}>
            {cancelText}
          </Action>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
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
        </View>
      </View>
    </Sheet>
  );
}
