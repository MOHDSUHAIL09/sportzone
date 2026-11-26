import React, { useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiChevronDown, FiChevronUp, FiSearch, FiX } from 'react-icons/fi';
import {
  ALL_RULE_SPORTS,
  SPORTS_RULES_BY_KEY,
  normalizeRuleSportKey,
} from '../data/sportsMarketRules';

const SECTION_DEFS = [
  { key: 'bookmaker', label: 'bookmaker' },
  { key: 'match', label: 'match' },
  { key: 'fancy', label: 'fancy' },
];

export default function ExchangeRulesModal({ open, onClose, initialSport = 'football' }) {
  const [selectedSport, setSelectedSport] = useState(() => normalizeRuleSportKey(initialSport));
  const [sportSearch, setSportSearch] = useState('');
  const [openSections, setOpenSections] = useState({
    bookmaker: true,
    match: true,
    fancy: true,
  });

  useEffect(() => {
    if (open) {
      setSelectedSport(normalizeRuleSportKey(initialSport));
      setOpenSections({ bookmaker: true, match: true, fancy: true });
    }
  }, [open, initialSport]);

  const filteredSports = useMemo(() => {
    const q = sportSearch.trim().toLowerCase();
    if (!q) return ALL_RULE_SPORTS;
    return ALL_RULE_SPORTS.filter((s) => s.label.toLowerCase().includes(q));
  }, [sportSearch]);

  if (!open) return null;

  const activeSportMeta =
    ALL_RULE_SPORTS.find((s) => s.key === selectedSport) || ALL_RULE_SPORTS[0];
  const rules = SPORTS_RULES_BY_KEY[selectedSport] || SPORTS_RULES_BY_KEY.football;

  function toggleSection(key) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-2 p-sm-3"
      style={{ backgroundColor: 'rgba(6, 14, 26, 0.78)', zIndex: 1090 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ex-rules-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-100 d-flex flex-column shadow-lg"
        style={{
          maxWidth: 960,
          height: '88vh',
          maxHeight: 740,
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          color: '#0f172a',
        }}
      >
        {/* Top Blue Modal Header */}
        <div
          className="d-flex align-items-center justify-content-between px-3 py-2 flex-shrink-0"
          style={{ backgroundColor: '#135E83', color: '#FFFFFF' }}
        >
          <div className="d-flex align-items-center gap-2">
            <FiBookOpen size={17} />
            <h2
              id="ex-rules-title"
              className="mb-0 fw-bold"
              style={{ fontSize: '1rem', letterSpacing: '0.01em' }}
            >
              Rules — {activeSportMeta.label}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-sm border-0 text-white p-1 d-inline-flex align-items-center"
            onClick={onClose}
            aria-label="Close rules"
            style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 5 }}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Mobile Sport Picker (< 768px) */}
        <div
          className="d-md-none px-3 py-2 flex-shrink-0"
          style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}
        >
          <select
            className="form-select form-select-sm"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            aria-label="Select sport rules"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderColor: '#94a3b8',
              fontWeight: 600,
              fontSize: '0.84rem',
            }}
          >
            {ALL_RULE_SPORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Split Body: Left 39-Sport Sidebar + Right Rules Content */}
        <div className="d-flex flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Desktop Left Sports Sidebar */}
          <aside
            className="d-none d-md-flex flex-column flex-shrink-0"
            style={{
              width: 224,
              backgroundColor: '#f1f5f9',
              borderRight: '1px solid #cbd5e1',
              minHeight: 0,
            }}
          >
            <div className="p-2 flex-shrink-0" style={{ borderBottom: '1px solid #dbe4f0' }}>
              <div className="position-relative">
                <FiSearch
                  size={13}
                  style={{
                    position: 'absolute',
                    left: 9,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                  }}
                />
                <input
                  type="text"
                  value={sportSearch}
                  onChange={(e) => setSportSearch(e.target.value)}
                  placeholder="Search sport..."
                  style={{
                    width: '100%',
                    padding: '5px 8px 5px 28px',
                    fontSize: '0.78rem',
                    borderRadius: 5,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div className="overflow-auto flex-grow-1" style={{ padding: '4px 0' }}>
              {filteredSports.map((sport) => {
                const isActive = sport.key === selectedSport;
                return (
                  <button
                    key={sport.key}
                    type="button"
                    onClick={() => setSelectedSport(sport.key)}
                    className="w-100 text-start border-0"
                    style={{
                      display: 'block',
                      padding: '7px 14px',
                      fontSize: '0.81rem',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? '#135E83' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#1e293b',
                      borderBottom: '1px solid rgba(203, 213, 225, 0.55)',
                      cursor: 'pointer',
                    }}
                  >
                    {sport.label}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Rules Content (bookmaker / match / fancy accordions) */}
          <div
            className="flex-grow-1 overflow-auto p-3"
            style={{ backgroundColor: '#ffffff', minHeight: 0 }}
          >
            <div className="d-flex flex-column gap-3">
              {SECTION_DEFS.map((sec) => {
                const entries = rules[sec.key] || [];
                if (entries.length === 0) return null;
                const isOpen = !!openSections[sec.key];

                return (
                  <div
                    key={sec.key}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.key)}
                      className="w-100 d-flex align-items-center justify-content-between px-3 py-2 border-0"
                      style={{
                        backgroundColor: '#135E83',
                        color: '#FFFFFF',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      <span>{sec.label}</span>
                      {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>

                    {isOpen && (
                      <div className="p-3 d-flex flex-column gap-2" style={{ backgroundColor: '#f8fafc' }}>
                        {entries.map((entry, idx) => {
                          if (typeof entry === 'string') {
                            return (
                              <div
                                key={idx}
                                className="p-2 px-3"
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 5,
                                  fontSize: '0.82rem',
                                  color: '#1e293b',
                                  lineHeight: 1.55,
                                }}
                              >
                                {entry}
                              </div>
                            );
                          }
                          return (
                            <div
                              key={idx}
                              className="p-2 px-3"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 5,
                                fontSize: '0.82rem',
                                color: '#1e293b',
                                lineHeight: 1.55,
                              }}
                            >
                              <strong style={{ color: '#0c4a6e' }}>{entry.heading} :- </strong>
                              <span style={{ whiteSpace: 'pre-line' }}>{entry.body}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div
          className="d-flex align-items-center justify-content-between px-3 py-2 flex-shrink-0"
          style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #cbd5e1' }}
        >
          <span style={{ fontSize: '0.75rem', color: '#475569' }}>
            All {ALL_RULE_SPORTS.length} official market rulebooks active in live settlement
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#135E83',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 5,
              padding: '6px 18px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
