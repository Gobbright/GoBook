const GSI_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise;

function loadGsiScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.querySelector(`script[src="${GSI_SRC}"]`) || document.createElement('script');
    if (!script.src) {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load Google sign-in')), { once: true });
  });
  return scriptPromise;
}

export async function renderGoogleSignInButton(container, onCredential, onError, options = {}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google sign-in is not configured');
  await loadGsiScript();
  window.google.accounts.id.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    callback: ({ credential }) => (
      credential
        ? Promise.resolve(onCredential(credential)).catch(onError)
        : onError(new Error('Google sign-in was cancelled'))
    ),
  });

  container.replaceChildren();
  const rawWidth = Math.floor(container.getBoundingClientRect().width);
  // Google Identity Services restricts button width strictly between 200px and 400px
  const buttonWidth = Math.min(400, Math.max(200, Number(options.width) || rawWidth || 280));
  const isDark = document.documentElement.classList.contains('dark');

  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: isDark ? 'filled_black' : 'outline',
    size: 'large',
    text: 'signin_with',
    shape: options.shape || 'rectangular',
    width: buttonWidth,
    logo_alignment: options.logoAlignment || 'left',
  });
}
