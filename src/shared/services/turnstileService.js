
const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const LOGIN_EXPECTED_ACTION = 'login';
export const REGISTER_EXPECTED_ACTION = 'register';

const getAllowedHostnames = () => {
  const hostnames = process.env.TURNSTILE_ALLOWED_HOSTNAMES || '';

  return new Set(
    hostnames
      .split(',')
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
};

export const verifyTurnstileService = async ({token, remoteIp,  expectedAction}) => {
  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > 2048
  ) {
    console.log(`turnstileService : TOKEN ERROR`)
    return false;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  const allowedHostnames = getAllowedHostnames();

  if (!secret || allowedHostnames.size === 0) {
    throw new Error('Turnstile configuration is incomplete');
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

  let response;

  try {
    response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error('Turnstile request failed:', error.message);
    throw new Error('Turnstile verification service unavailable');
  }

  if (!response.ok) {
    throw new Error(
      `Turnstile Siteverify returned HTTP ${response.status}`,
    );
  }

  const result = await response.json();
  console.log(`result verification: ${JSON.stringify(result)}`)

  if (!result.success) {
    return false;
  }

  const hostname = result.hostname?.toLowerCase();

  if (
    result.action !== expectedAction ||
    !allowedHostnames.has(hostname)
  ) {
    return false;
  }

  return true;
};
