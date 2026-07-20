const GSI_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
let hiddenButtonContainer = null;

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

// Opens the real Google account chooser popup via a hidden native Google button,
// so the visible UI can keep a custom-styled "Sign in with Google" button.
export async function signInWithGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google sign-in is not configured yet.');
  }

  await loadGsiScript();

  return new Promise((resolve, reject) => {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response?.credential) resolve(response.credential);
        else reject(new Error('Google sign-in was cancelled'));
      },
    });

    if (!hiddenButtonContainer) {
      hiddenButtonContainer = document.createElement('div');
      hiddenButtonContainer.style.position = 'fixed';
      hiddenButtonContainer.style.top = '-9999px';
      hiddenButtonContainer.style.left = '-9999px';
      document.body.appendChild(hiddenButtonContainer);
    }
    hiddenButtonContainer.innerHTML = '';
    window.google.accounts.id.renderButton(hiddenButtonContainer, { type: 'standard' });

    const realButton = hiddenButtonContainer.querySelector('div[role="button"]');
    if (!realButton) {
      reject(new Error('Unable to start Google sign-in'));
      return;
    }
    realButton.click();
  });
}
