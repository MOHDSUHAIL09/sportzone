import React, { useState } from 'react';
import { getInitials } from '../utils/formatters';

export default function EntityImage({ src, name = '', size = 28, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={`sz-avatar-fallback ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(10, Math.floor(size * 0.36)),
        }}
        aria-label={name || 'Emblem'}
      >
        {getInitials(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Logo'}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`sz-avatar ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
