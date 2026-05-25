import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './use-theme-store';

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reset store state before each test if needed
    // Zustand persist might make this tricky, but for unit tests we can just set defaults
    useThemeStore.setState({
      accentColor: 'indigo',
      isIndustrial: true,
      scanlines: true,
      glassmorphism: true,
    });
  });

  it('should initialize with default values', () => {
    const state = useThemeStore.getState();
    expect(state.accentColor).toBe('indigo');
    expect(state.isIndustrial).toBe(true);
    expect(state.scanlines).toBe(true);
    expect(state.glassmorphism).toBe(true);
  });

  it('should update accent color', () => {
    useThemeStore.getState().setAccentColor('crimson');
    expect(useThemeStore.getState().accentColor).toBe('crimson');
  });

  it('should toggle industrial mode', () => {
    useThemeStore.getState().toggleIndustrial();
    expect(useThemeStore.getState().isIndustrial).toBe(false);
    useThemeStore.getState().toggleIndustrial();
    expect(useThemeStore.getState().isIndustrial).toBe(true);
  });

  it('should toggle scanlines', () => {
    useThemeStore.getState().toggleScanlines();
    expect(useThemeStore.getState().scanlines).toBe(false);
  });

  it('should toggle glassmorphism', () => {
    useThemeStore.getState().toggleGlassmorphism();
    expect(useThemeStore.getState().glassmorphism).toBe(false);
  });
});
