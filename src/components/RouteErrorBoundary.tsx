import { useEffect } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText || ''}`.trim();
  }
  if (error instanceof Error) return error.message || 'Something went wrong.';
  return 'Something went wrong.';
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  useEffect(() => {
    console.error('Route error', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', background: '#f7fafc' }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', padding: '1.25rem', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}>
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>We hit a snag</div>
            <div className="muted" style={{ fontSize: '0.95rem' }}>
              The page ran into an error. Please try again or return to the dashboard.
            </div>
          </div>
        </div>
        <div className="muted" style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 700 }}>Details:</span> {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button ghost" onClick={() => window.location.reload()}>
            Retry
          </button>
          <Link className="button" to={import.meta.env.BASE_URL || '/'}>
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
