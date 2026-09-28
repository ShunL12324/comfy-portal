import { FieldLabel, useDesign } from '@/components/ui/design-system/primitives';
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
} from '@/components/ui/form-control';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import React from 'react';
import { designTokens as t } from '@/constants/design-tokens';
import { useWindowDimensions } from 'react-native';

interface KeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Whether to close the modal when backdrop is pressed
   * @default true
   */
  closeOnOverlayClick?: boolean;
}

interface KeyboardModalHeaderProps {
  children: React.ReactNode;
}

interface KeyboardModalBodyProps {
  children: React.ReactNode;
  scrollEnabled?: boolean;
}

interface KeyboardModalFooterProps {
  children: React.ReactNode;
}

interface KeyboardModalItemProps {
  children: React.ReactNode;
  title: string;
  error?: string;
  className?: string;
}

const KeyboardModalHeader = ({ children }: KeyboardModalHeaderProps) => {
  return <ModalHeader>{children}</ModalHeader>;
};

const KeyboardModalBody = ({ children, scrollEnabled }: KeyboardModalBodyProps) => {
  return (
    <ModalBody
      scrollEnabled={scrollEnabled}
      keyboardShouldPersistTaps="handled"
      style={{ marginTop: t.layout.field, marginBottom: t.layout.field }}
    >
      {children}
    </ModalBody>
  );
};

const KeyboardModalFooter = ({ children }: KeyboardModalFooterProps) => {
  return <ModalFooter>{children}</ModalFooter>;
};

const KeyboardModalItem = ({ children, title, error, className }: KeyboardModalItemProps) => {
  return (
    <FormControl isInvalid={!!error} size="md" className={className}>
      <FormControlLabel>
        <FieldLabel>{title}</FieldLabel>
      </FormControlLabel>
      {children}
      {error && (
        <FormControlError>
          <FormControlErrorText className="mt-1 text-status-danger-pressed" style={{ fontSize: t.type.metadata, lineHeight: t.leading.metadata }}>{error}</FormControlErrorText>
        </FormControlError>
      )}
    </FormControl>
  );
};

const KeyboardModalRoot = ({ isOpen, onClose, children, closeOnOverlayClick = true }: KeyboardModalProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const c = useDesign();

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={closeOnOverlayClick} avoidKeyboard>
      <ModalBackdrop />
      <ModalContent
        style={[
          {
            width: Math.min(windowWidth - 32, 480),
            maxHeight: '90%',
            backgroundColor: c.overlay,
            borderRadius: t.radius.panel,
            padding: t.layout.inset,
            shadowOpacity: 0,
            elevation: 0,
          },
        ]}
        className="overflow-hidden border-0"
      >
        {children}
      </ModalContent>
    </Modal>
  );
};

export const KeyboardModal = Object.assign(KeyboardModalRoot, {
  Header: KeyboardModalHeader,
  Body: KeyboardModalBody,
  Footer: KeyboardModalFooter,
  Item: KeyboardModalItem,
});
