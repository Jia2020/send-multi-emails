import { Component } from 'react';
import { I18nContext } from '../i18n.jsx';

export default class ErrorBoundary extends Component {
  static contextType = I18nContext;

  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { t } = this.context;
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h2>{t('err.page')}</h2>
          <p>{t('err.errHint')}</p>
          <pre>{this.state.error.message}</pre>
          <button
            className="btn primary"
            onClick={() => window.location.reload()}
          >
            {t('err.reload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
