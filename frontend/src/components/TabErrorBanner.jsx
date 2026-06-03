/** SCRUM-83: shared error banner shown above tab content. */

export default function TabErrorBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div className="tab-err-banner" role="alert">
      <span className="tab-err-banner-msg">⚠️ {message}</span>
      <div className="tab-err-banner-actions">
        {onRetry && (
          <button type="button" className="tab-err-retry" onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button type="button" className="tab-err-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
