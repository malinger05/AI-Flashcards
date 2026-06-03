/** SCRUM-85: shared loading and empty states for tab panes. */

export function TabLoading({ message = "Loading…" }) {
  return (
    <div className="tab-pane center-pane">
      <div className="tab-loading">
        <span className="spin tab-loading-spin" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}

export function TabEmpty({ icon = "📭", title, message }) {
  return (
    <div className="tab-pane center-pane">
      <div className="empty">
        <div className="empty-ico">{icon}</div>
        {title ? <h2 className="empty-title">{title}</h2> : null}
        <p>{message}</p>
      </div>
    </div>
  );
}
