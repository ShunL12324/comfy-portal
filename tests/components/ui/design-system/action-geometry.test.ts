/**
 * Labelled actions pair a micro icon, in a slot sized to it, with a 6pt label gap;
 * icon-only actions keep their 16pt minimum slot, ring and no gap.
 */
import { actionIconGeometry } from '@/components/ui/design-system/action-geometry';
import { designTokens as t } from '@/constants/design-tokens';

describe('actionIconGeometry', () => {
  it('sizes a labelled icon to the label and its slot to the icon', () => {
    expect(actionIconGeometry({ iconOnly: false, inAppBar: false })).toEqual({
      iconSize: t.icon.micro,
      slot: t.icon.micro,
      spinner: t.icon.micro,
      gap: t.layout.iconLabel,
    });
    expect(t.layout.iconLabel).toBe(6);
  });

  it('treats labelled app bar actions like any labelled action', () => {
    expect(actionIconGeometry({ iconOnly: false, inAppBar: true })).toMatchObject({
      iconSize: t.icon.micro,
      slot: t.icon.micro,
      gap: t.layout.iconLabel,
    });
  });

  it('keeps standalone icon-only geometry', () => {
    expect(actionIconGeometry({ iconOnly: true, inAppBar: false })).toEqual({
      iconSize: t.icon.small,
      slot: t.icon.control,
      spinner: t.icon.control,
      gap: 0,
    });
  });

  it('keeps app bar icon-only geometry', () => {
    expect(actionIconGeometry({ iconOnly: true, inAppBar: true })).toEqual({
      iconSize: t.icon.large,
      slot: t.icon.large,
      spinner: t.icon.control,
      gap: 0,
    });
  });

  it('honours an explicit icon size', () => {
    expect(actionIconGeometry({ iconOnly: false, inAppBar: false, iconSize: t.icon.small })).toMatchObject({
      iconSize: t.icon.small,
      slot: t.icon.small,
    });
    expect(actionIconGeometry({ iconOnly: true, inAppBar: false, iconSize: t.icon.large })).toMatchObject({
      iconSize: t.icon.large,
      slot: t.icon.large,
    });
  });
});
