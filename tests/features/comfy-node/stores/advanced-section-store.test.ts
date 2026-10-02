import AsyncStorage from '@react-native-async-storage/async-storage';
import { advancedSectionKey, useAdvancedSectionStore } from '@/features/comfy-node/stores/advanced-section-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('useAdvancedSectionStore', () => {
  beforeEach(() => useAdvancedSectionStore.setState({ open: {} }));

  it('remembers each node on its own, per workflow', () => {
    const { setOpen } = useAdvancedSectionStore.getState();
    setOpen(advancedSectionKey('wf-1', '7'), true);
    expect(useAdvancedSectionStore.getState().open).toEqual({ 'wf-1/7': true });
    setOpen(advancedSectionKey('wf-2', '7'), true);
    setOpen(advancedSectionKey('wf-1', '7'), false);
    expect(useAdvancedSectionStore.getState().open).toEqual({ 'wf-2/7': true });
  });

  it('keeps the same state object when nothing changes', () => {
    const before = useAdvancedSectionStore.getState().open;
    useAdvancedSectionStore.getState().setOpen('wf/1', false);
    expect(useAdvancedSectionStore.getState().open).toBe(before);
  });

  it('persists only the open sections', async () => {
    useAdvancedSectionStore.getState().setOpen('wf/3', true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const stored = JSON.parse((await AsyncStorage.getItem('comfy-node-advanced-sections')) ?? '{}');
    expect(stored.state).toEqual({ open: { 'wf/3': true } });
  });
});
