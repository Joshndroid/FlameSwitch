import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

// Redux
import { useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';

// Typescript
import { ApiResponse } from '../../../interfaces';

// Other
import { InputGroup, Button } from '../../UI';
import { applyAuth } from '../../../utility';
import classes from './StyleSettings.module.css';

const FONT_CSS_TEMPLATE = `@font-face {
  font-family: 'Custom Flame Font';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/CustomFont-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Custom Flame Font';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/CustomFont-Medium.woff2') format('woff2');
}

@font-face {
  font-family: 'Custom Flame Font';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/CustomFont-Bold.woff2') format('woff2');
}

@font-face {
  font-family: 'Custom Flame Font';
  font-style: normal;
  font-weight: 900;
  font-display: swap;
  src: url('/fonts/CustomFont-ExtraBold.woff2') format('woff2');
}

body {
  font-family: 'Custom Flame Font', monospace;
  font-size: 13px;
  line-height: 1.2;
}
`;

const fontFacts = [
  'Use .woff2 files for best browser support and small file size.',
  'Current font family: JetBrains Mono.',
  'Current weights: 400 Regular, 500 Medium, 700 Bold, 900 ExtraBold.',
  'Current base size: 13px with line-height 1.2; large headers use 4em.',
  'Common text sizes: cards and tables use 16px, section/settings headlines use 20px.',
  'The font URL must be reachable by the browser, such as a served /fonts/MyFont.woff2 path or an https URL.',
];

export const StyleSettings = (): JSX.Element => {
  const dispatch = useDispatch();
  const { createNotification } = bindActionCreators(actionCreators, dispatch);

  const [customStyles, setCustomStyles] = useState<string>('');
  const [showFontHint, setShowFontHint] = useState<boolean>(false);

  useEffect(() => {
    axios
      .get<ApiResponse<string>>('/api/config/0/css')
      .then((data) => setCustomStyles(data.data.data))
      .catch((err) => console.log(err.response));
  }, []);

  const inputChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setCustomStyles(e.target.value);
  };

  const formSubmitHandler = (e: FormEvent) => {
    e.preventDefault();

    axios
      .put<ApiResponse<{}>>(
        '/api/config/0/css',
        { styles: customStyles },
        { headers: applyAuth() }
      )
      .then(() => {
        createNotification({
          title: 'Success',
          message: 'CSS saved. Reload page to see changes',
        });
      })
      .catch((err) => console.log(err.response));
  };

  const toggleFontHintHandler = () => {
    setShowFontHint((state) => !state);
  };

  const insertFontTemplateHandler = () => {
    const spacer = customStyles.trim().length > 0 ? '\n\n' : '';
    setCustomStyles(`${customStyles}${spacer}${FONT_CSS_TEMPLATE}`);
  };

  return (
    <form onSubmit={(e) => formSubmitHandler(e)}>
      <div className={classes.FontHint}>
        <button
          className={classes.FontHintToggle}
          type="button"
          onClick={toggleFontHintHandler}
        >
          {showFontHint ? 'Hide font hint' : 'Show font hint'}
        </button>

        {showFontHint && (
          <div className={classes.FontHintContent}>
            <p>
              Add browser-accessible .woff2 files, then paste @font-face blocks
              into the custom CSS below.
            </p>
            <ul>
              {fontFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            <pre className={classes.FontHintCode}>{FONT_CSS_TEMPLATE}</pre>
            <button
              className={classes.FontHintAction}
              type="button"
              onClick={insertFontTemplateHandler}
            >
              Insert font template
            </button>
          </div>
        )}
      </div>

      <InputGroup>
        <label htmlFor="customStyles">Custom CSS</label>
        <textarea
          id="customStyles"
          name="customStyles"
          value={customStyles}
          onChange={(e) => inputChangeHandler(e)}
          spellCheck={false}
        ></textarea>
      </InputGroup>
      <Button>Save CSS</Button>
    </form>
  );
};
