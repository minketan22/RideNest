const isLocalHostname = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isBackendOrigin =
    window.location.protocol.startsWith('http') &&
    window.location.hostname &&
    (!window.location.port || window.location.port === '3000');

const API_BASE_URL = isBackendOrigin
    ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
    : isLocalHostname
      ? 'http://localhost:3000'
      : 'http://localhost:3000';
