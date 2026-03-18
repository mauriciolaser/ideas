import { useMemo } from 'react';
import { useUi } from '../hooks/useUi';

export default function LanguageToggle() {
  const { ui, language, setLanguage, t } = useUi();

  const languageEntries = useMemo(() => {
    const entries = Object.entries(ui.languages || {});
    return entries.sort((a, b) => {
      if (a[0] === ui.meta?.defaultLanguage) return -1;
      if (b[0] === ui.meta?.defaultLanguage) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [ui.languages, ui.meta?.defaultLanguage]);

  return (
    <div style={{
      position: 'fixed',
      top: '12px',
      right: '12px',
      display: 'flex',
      gap: '6px',
      padding: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '999px',
      border: '1px solid #e6e6e6',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      zIndex: 10002,
      backdropFilter: 'blur(6px)',
    }}>
      {languageEntries.map(([code, info]) => {
        const isActive = code === language;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={isActive}
            aria-label={t('language.switchTo', { language: info.label })}
            title={t('language.switchTo', { language: info.label })}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: isActive ? '1px solid #333' : '1px solid transparent',
              backgroundColor: isActive ? '#fff' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              cursor: isActive ? 'default' : 'pointer',
              opacity: isActive ? 1 : 0.7,
              transition: 'all 0.15s ease',
            }}
          >
            <span aria-hidden="true">{info.flag}</span>
          </button>
        );
      })}
    </div>
  );
}
