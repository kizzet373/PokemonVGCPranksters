import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function ModalShell({ ariaLabel, children, className = '', eyebrow, onClose, stats, title }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label={ariaLabel}
        aria-modal="true"
        className={`player-modal ${className}`.trim()}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="player-modal__header">
          <div>
            <small>{eyebrow}</small>
            <h2>{title}</h2>
          </div>
          <button aria-label={`Close ${title}`} className="icon-button" onClick={onClose} type="button">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        {stats ? (
          <div className="player-modal__stats">
            {stats.map((stat) => (
              <span key={stat.label}>
                <strong>{stat.value}</strong>
                <small>{stat.label}</small>
              </span>
            ))}
          </div>
        ) : null}
        {children}
      </section>
    </div>
  );
}
