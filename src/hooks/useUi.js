import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import uiData from '../data/ui.json';

const UiContext = createContext(null);

const DEFAULT_LANGUAGE = uiData?.meta?.defaultLanguage || 'es';
const LANGUAGE_STORAGE_KEY = uiData?.meta?.storage?.languageKey || 'ideas-ui-language';

function resolveLanguage(value) {
  if (value && uiData?.languages?.[value]) {
    return value;
  }
  return DEFAULT_LANGUAGE;
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function applyTemplate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined || value === null ? match : String(value);
  });
}

function resolveText(language, key) {
  const fromLang = getByPath(uiData?.text?.[language], key);
  if (fromLang !== undefined) return fromLang;
  return getByPath(uiData?.text?.[DEFAULT_LANGUAGE], key);
}

function isPluralEntry(value) {
  return value && typeof value === 'object' && 'one' in value && 'other' in value;
}

export function UiProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LANGUAGE;
    }
    try {
      const stored = window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
      return resolveLanguage(stored);
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });

  const setLanguage = useCallback((next) => {
    setLanguageState(resolveLanguage(next));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // ignore storage failures
    }
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.documentElement) {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback((key, params = {}) => {
    const value = resolveText(language, key);
    if (value === undefined) return key;
    if (isPluralEntry(value)) {
      const count = Number(params.count);
      const template = count === 1 ? value.one : value.other;
      return applyTemplate(template, { ...params, count });
    }
    if (typeof value === 'string') {
      return applyTemplate(value, params);
    }
    return value;
  }, [language]);

  const getErrorMessage = useCallback((error, fallbackKey) => {
    const code = error?.code || error?.message;
    if (code) {
      const entry = resolveText(language, `errors.${code}`);
      if (entry !== undefined) {
        return t(`errors.${code}`, error?.meta);
      }
    }
    if (fallbackKey) {
      return t(fallbackKey);
    }
    return t('errors.unknown_error');
  }, [language, t]);

  const value = useMemo(() => ({
    ui: uiData,
    language,
    setLanguage,
    t,
    getErrorMessage,
  }), [language, setLanguage, t, getErrorMessage]);

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error('useUi must be used within UiProvider');
  }
  return context;
}
