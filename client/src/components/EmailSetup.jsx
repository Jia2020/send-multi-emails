import { useState } from 'react';
import { useI18n } from '../i18n.jsx';

export const PROVIDERS = {
  outlook: { nameKey: 'prov.outlook.name', hintKey: 'prov.outlook.hint', host: 'smtp.office365.com', port: 587, secure: false },
  yahoo: { nameKey: 'prov.yahoo.name', hintKey: 'prov.yahoo.hint', host: 'smtp.mail.yahoo.com', port: 465, secure: true },
  gmail: { nameKey: 'prov.gmail.name', hintKey: 'prov.gmail.hint', host: 'smtp.gmail.com', port: 465, secure: true },
  qq: { nameKey: 'prov.qq.name', hintKey: 'prov.qq.hint', host: 'smtp.qq.com', port: 465, secure: true },
  '163': { nameKey: 'prov.163.name', hintKey: 'prov.163.hint', host: 'smtp.163.com', port: 465, secure: true },
  custom: { nameKey: 'prov.custom.name', hintKey: 'prov.custom.hint', host: '', port: 465, secure: true },
};

function ElasticForm({ config, onChange }) {
  const { t } = useI18n();
  return (
    <div className="form-grid">
      <label className="field span2">
        <span>Elastic Email {t('email.fieldApiKey')}</span>
        <input
          type="password"
          value={config.elasticApiKey || ''}
          placeholder={t('email.yourApiKey')}
          onChange={(e) => onChange({ ...config, elasticApiKey: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.fromName')}</span>
        <input
          type="text"
          value={config.elasticFromName || ''}
          placeholder={t('email.yourName')}
          onChange={(e) => onChange({ ...config, elasticFromName: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.fromEmail')}</span>
        <input
          type="email"
          value={config.elasticFromEmail || ''}
          placeholder="you@gmail.com"
          onChange={(e) => onChange({ ...config, elasticFromEmail: e.target.value })}
        />
      </label>

      <label className="field span2">
        <span>{t('email.testEmail')}</span>
        <input
          type="email"
          value={config.elasticTestEmail || ''}
          placeholder="test@example.com"
          onChange={(e) => onChange({ ...config, elasticTestEmail: e.target.value })}
        />
      </label>

      <p className="hint" style={{ gridColumn: 'span 2', margin: 0 }}>
        {t('email.stepsElastic')}
      </p>
    </div>
  );
}

function BrevoForm({ config, onChange }) {
  const { t } = useI18n();
  return (
    <div className="form-grid">
      <label className="field span2">
        <span>Brevo {t('email.fieldApiKey')}</span>
        <input
          type="password"
          value={config.brevoApiKey || ''}
          placeholder="xkeysib-xxxxxxxxxxxxxxxx"
          onChange={(e) => onChange({ ...config, brevoApiKey: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.fromName')}</span>
        <input
          type="text"
          value={config.brevoFromName || ''}
          placeholder={t('email.yourName')}
          onChange={(e) => onChange({ ...config, brevoFromName: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.fromEmail')}</span>
        <input
          type="email"
          value={config.brevoFromEmail || ''}
          placeholder="you@gmail.com"
          onChange={(e) => onChange({ ...config, brevoFromEmail: e.target.value })}
        />
      </label>

      <label className="field span2">
        <span>{t('email.testEmail')}</span>
        <input
          type="email"
          value={config.brevoTestEmail || ''}
          placeholder="test@example.com"
          onChange={(e) => onChange({ ...config, brevoTestEmail: e.target.value })}
        />
      </label>

      <p className="hint" style={{ gridColumn: 'span 2', margin: 0 }}>
        {t('email.stepsBrevo')}
      </p>
    </div>
  );
}

function GasForm({ config, onChange }) {
  const { t } = useI18n();
  return (
    <div className="form-grid">
      <label className="field span2">
        <span>{t('email.gasUrl')}</span>
        <input
          type="text"
          value={config.gasUrl || ''}
          placeholder="https://script.google.com/macros/s/xxxx/exec"
          onChange={(e) => onChange({ ...config, gasUrl: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.fromName')}</span>
        <input
          type="text"
          value={config.gasFromName || ''}
          placeholder={t('email.yourName')}
          onChange={(e) => onChange({ ...config, gasFromName: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.testEmail')}</span>
        <input
          type="email"
          value={config.gasTestEmail || ''}
          placeholder="test@example.com"
          onChange={(e) => onChange({ ...config, gasTestEmail: e.target.value })}
        />
      </label>

      <p className="hint" style={{ gridColumn: 'span 2', margin: 0 }}>
        {t('email.stepsGas')}
      </p>
    </div>
  );
}

function SmtpForm({ config, onChange }) {
  const { t } = useI18n();
  const [provider, setProvider] = useState(config.provider || 'outlook');
  const [showPass, setShowPass] = useState(false);

  function selectProvider(key) {
    setProvider(key);
    const p = PROVIDERS[key];
    onChange({ ...config, provider: key, host: p.host, port: p.port, secure: p.secure });
  }

  return (
    <div className="form-grid">
      <label className="field span2">
        <span>{t('email.provider')}</span>
        <select value={provider} onChange={(e) => selectProvider(e.target.value)}>
          {Object.entries(PROVIDERS).map(([k, p]) => (
            <option key={k} value={k}>{t(p.nameKey)}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t('email.fromName')}</span>
        <input
          type="text"
          value={config.fromName || ''}
          placeholder={t('email.yourName')}
          onChange={(e) => onChange({ ...config, fromName: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.emailAddr')}</span>
        <input
          type="email"
          value={config.user || ''}
          placeholder="you@example.com"
          onChange={(e) => onChange({ ...config, user: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.password')}</span>
        <div className="pass-wrap">
          <input
            type={showPass ? 'text' : 'password'}
            value={config.pass || ''}
            placeholder="••••••••"
            onChange={(e) => onChange({ ...config, pass: e.target.value })}
          />
          <button type="button" className="ghost-btn" onClick={() => setShowPass((s) => !s)}>
            {showPass ? t('email.hide') : t('email.show')}
          </button>
        </div>
      </label>

      <label className="field">
        <span>{t('email.smtpHost')}</span>
        <input
          type="text"
          value={config.host || ''}
          placeholder="smtp.example.com"
          onChange={(e) => onChange({ ...config, host: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{t('email.port')}</span>
        <input
          type="number"
          value={config.port || 465}
          onChange={(e) => onChange({ ...config, port: Number(e.target.value) })}
        />
      </label>

      <label className="check-field span2">
        <input
          type="checkbox"
          checked={!!config.secure}
          onChange={(e) => onChange({ ...config, secure: e.target.checked })}
        />
        <span>{t('email.ssl')}</span>
      </label>

      {PROVIDERS[provider].hintKey && (
        <p className="hint" style={{ gridColumn: 'span 2' }}>{t('email.hintPrefix', { hint: t(PROVIDERS[provider].hintKey) })}</p>
      )}
    </div>
  );
}

export default function EmailSetup({ config, onChange, connected, testing, result, onTest }) {
  const { t, msg } = useI18n();
  const mode = config.mode || 'elastic';
  const elasticReady = Boolean(config.elasticApiKey && config.elasticFromEmail);
  const brevoReady = Boolean(config.brevoApiKey && config.brevoFromEmail);
  const gasReady = Boolean(config.gasUrl);
  const smtpReady = Boolean(config.host && config.port && config.user && config.pass);
  const ready =
    mode === 'elastic' ? elasticReady : mode === 'brevo' ? brevoReady : mode === 'gas' ? gasReady : smtpReady;

  return (
    <div className="card">
      <div className="card-head">
        <span className="step-badge">1</span>
        <div>
          <h2>{t('email.title')}</h2>
          <p className="muted">
            {mode === 'elastic'
              ? t('email.descElastic')
              : mode === 'brevo'
                ? t('email.descBrevo')
                : mode === 'gas'
                  ? t('email.descGas')
                  : t('email.descSmtp')}
          </p>
        </div>
        {connected && <span className="pill ok">{t('email.connected')}</span>}
      </div>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'elastic' ? 'active' : ''}`}
          onClick={() => onChange({ ...config, mode: 'elastic' })}
        >
          Elastic Email
        </button>
        <button
          className={`mode-tab ${mode === 'brevo' ? 'active' : ''}`}
          onClick={() => onChange({ ...config, mode: 'brevo' })}
        >
          Brevo
        </button>
        <button
          className={`mode-tab ${mode === 'gas' ? 'active' : ''}`}
          onClick={() => onChange({ ...config, mode: 'gas' })}
        >
          {t('email.tabGmail')}
        </button>
        <button
          className={`mode-tab ${mode === 'smtp' ? 'active' : ''}`}
          onClick={() => onChange({ ...config, mode: 'smtp' })}
        >
          SMTP
        </button>
      </div>

      {mode === 'elastic' ? (
        <ElasticForm config={config} onChange={onChange} />
      ) : mode === 'brevo' ? (
        <BrevoForm config={config} onChange={onChange} />
      ) : mode === 'gas' ? (
        <GasForm config={config} onChange={onChange} />
      ) : (
        <SmtpForm config={config} onChange={onChange} />
      )}

      <div className="form-grid">
        <label className="field span2">
          <span>{t('email.subjectLabel')}</span>
          <input
            type="text"
            value={config.subject || ''}
            placeholder={t('email.pdfPlaceholder')}
            onChange={(e) => onChange({ ...config, subject: e.target.value })}
          />
        </label>
        <label className="field span2">
          <span>{t('email.bodyLabel')}</span>
          <textarea
            rows="2"
            value={config.body || ''}
            placeholder={t('email.bodyPlaceholder')}
            onChange={(e) => onChange({ ...config, body: e.target.value })}
          />
        </label>
      </div>

      <div className="row-between">
        <button
          className="btn primary"
          disabled={testing || !ready}
          onClick={onTest}
        >
          {testing ? t('email.testing') : t('email.testBtn')}
        </button>
        {result && <span className={`result ${result.ok ? 'ok' : 'err'}`}>{msg(result.message)}</span>}
      </div>

      <p className="hint">
        {mode === 'elastic'
          ? t('email.hintElastic')
          : mode === 'brevo'
            ? t('email.hintBrevo')
            : mode === 'gas'
              ? t('email.hintGas')
              : t('email.hintSmtp')}
      </p>
    </div>
  );
}
