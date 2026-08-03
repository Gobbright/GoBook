const GSI_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;

function loadGsiScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google sign-in script')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in script'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function renderGoogleSignInButton(container, onCredential, onError) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google sign-in is not configured yet.');

  await loadGsiScript();

  window.google.accounts.id.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    callback: (response) => {
      if (!response?.credential) {
        onError(new Error('Google sign-in was cancelled'));
        return;
      }
      Promise.resolve(onCredential(response.credential)).catch(onError);
    },
  });

  container.innerHTML = '';
  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: String(Math.max(240, Math.floor(container.getBoundingClientRect().width))),
  });
}
