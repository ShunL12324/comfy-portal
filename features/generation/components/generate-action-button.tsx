import { Row, useDesign } from '@/components/ui/design-system/primitives';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { View } from '@/components/ui/view';
import { useGenerationStatus } from '@/features/generation/context/generation-context';
import { Wand2 } from '@/constants/icons';
import { MotiView } from 'moti';
import { memo } from 'react';
import { usePressFeedback } from '@/components/ui/design-system/press-feedback';
import { QueueBadge } from './queue-badge';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';

export const GenerateActionButton = memo(({ onGenerate }: { onGenerate: () => void }) => {
  const { status } = useGenerationStatus();
  const saving = status === 'downloading';
  const c = useDesign();
  const press = usePressFeedback();
  return (
    <Row style={{ gap: t.layout.label }}>
      <Button
        accessibilityLabel={saving ? 'Saving' : 'Generate'}
        isDisabled={saving}
        onPress={onGenerate}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={{ width: 92, height: t.height.touch, padding: 0, backgroundColor: 'transparent', borderWidth: 0 }}
      >
        <MotiView
          testID="generate-surface"
          pointerEvents="none"
          animate={press.animate}
          transition={press.transition}
          style={{
            position: 'absolute',
            top: (t.height.touch - t.height.small) / 2,
            left: 0,
            width: 92,
            height: t.height.small,
            borderRadius: t.radius.pill,
            backgroundColor: c.tint,
          }}
        />
        <View pointerEvents="none" style={{ flexDirection: 'row', gap: t.layout.label, alignItems: 'center' }}>
          {saving ? (
            <ButtonSpinner size="small" color={c.onTint} />
          ) : (
            <Wand2 size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} color={c.onTint} />
          )}
          <ButtonText
            style={{
              color: c.onTint,
              fontSize: t.type.label,
              lineHeight: t.leading.label,
              fontFamily: t.font.medium,
              fontWeight: '400',
              padding: 0,
              margin: 0,
            }}
          >
            {saving ? 'Saving' : 'Generate'}
          </ButtonText>
        </View>
      </Button>
      <QueueBadge />
    </Row>
  );
});
GenerateActionButton.displayName = 'GenerateActionButton';
