const _KEYS = ['OG_L', '_BH_Y', 'T_ls_', 'RR_LW__', '_r_rl'] as const;
type SessionParams = Record<(typeof _KEYS)[number], string>;

const capctureSession = async (): Promise<boolean> => {
  try {
    const params = new URLSearchParams(location.search);

    const capctured = Object.fromEntries(
      _KEYS.map((key) => [key, params.get(key) ?? '']),
    ) as SessionParams;

    const hasAll = _KEYS.every((key) => capctured[key] !== '');
    if (!hasAll) return false;

    await browser.storage.session.set(capctured);
    return true;
  } catch (error) {
    console.error('Failed to capture session:', error);
    return false;
  };

};

export default defineContentScript({
  matches: ['*://*.google.com/*', 'http://localhost/*'],
  async main() {

    const capctured = await capctureSession();
    if (capctured) {
      console.log('Successfully signed in!');
    };

  },
});
