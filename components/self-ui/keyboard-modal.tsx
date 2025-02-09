import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import React from 'react';
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
  return <ModalBody scrollEnabled={scrollEnabled}>{children}</ModalBody>;
};

const KeyboardModalFooter = ({ children }: KeyboardModalFooterProps) => {
  return <ModalFooter>{children}</ModalFooter>;
};

const KeyboardModalItem = ({ children, title, error, className }: KeyboardModalItemProps) => {
  return (
    <FormControl isInvalid={!!error} size="md" className={className}>
      <FormControlLabel>
        <FormControlLabelText className="text-sm font-medium text-primary-400">{title}</FormControlLabelText>
      </FormControlLabel>
      {children}
      {error && (
        <FormControlError>
          <FormControlErrorText className="mt-1 text-xs text-error-600">{error}</FormControlErrorText>
        </FormControlError>
      )}
    </FormControl>
  );
};

const KeyboardModalRoot = ({ isOpen, onClose, children, closeOnOverlayClick = true }: KeyboardModalProps) => {
  const { width: windowWidth } = useWindowDimensions();

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={closeOnOverlayClick} avoidKeyboard>
      <ModalBackdrop />
      <ModalContent
        style={{ width: windowWidth * 0.8 }}
        className="overflow-hidden rounded-xl border-0 bg-background-200"
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
