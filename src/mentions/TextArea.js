import React, { Component } from 'react';
import debounce from 'lodash/debounce';
import onClickOutside from 'react-onclickoutside';
import PropTypes from 'prop-types';
import Suggestions from './Suggestions';
import getCoordinates from './getCoordinates';

import './TextArea.css';

const KEYS = {
  TAB: 9,
  RETURN: 13,
  ESC: 27,
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
};

const ProxyPre = ({ value, isVisible = false }) => {
  return (
    isVisible && (
      <pre className="Mention-proxy">
        {value}
        <br />
      </pre>
    )
  );
};

class Highlighter extends Component {
  /**
   * @property {Object} propTypes
   */
  static defaultProps = {
    value: [],
    mentions: [],
  };

  /**
   * @property {Object} propTypes
   */
  static propTypes = {
    value: PropTypes.string.isRequired,
    mentions: PropTypes.array.isRequired,
  };

  /**
   * @param {Array|null} value
   * @param {Array} mentions
   */
  getHtmlValue(value, mentions = []) {
    return value
      .split(/(@\w+)/g)
      .map((str, key) => {
        if (mentions.indexOf(str) !== -1) {
          return (
            <mark key={key} className="Mention-mark">
              {str}
            </mark>
          );
        } else if (str.length > 0) {
          return str;
        } else {
          return null;
        }
      })
      .filter(el => el !== null);
  }

  render() {
    return [
      <div key="0" className="Mention-highlights">
        {this.getHtmlValue(this.props.value, this.props.mentions)}
      </div>,
      <br key="1" />,
    ];
  }
}

class Backdrop extends Component {
  /**
   * @property {Object} propTypes
   */
  static propTypes = {
    autoResize: PropTypes.bool,
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node,
    ]).isRequired,
  };

  static defaultProps = {
    autoResize: false,
  };

  /**
   * @param {Number} props.scrollTop
   * @param {Number} props.scrollLeft
   */
  scroll = ({ scrollTop, scrollLeft }) => {
    this.backdrop.scrollTop = scrollTop;
    this.backdrop.scrollLeft = scrollLeft;
  };

  getCustomStyle() {
    return {
      height: this.props.height,
      overflow: this.props.autoResize ? 'hidden' : 'auto',
    };
  }

  render() {
    return (
      <div
        style={this.getCustomStyle()}
        ref={backdrop => (this.backdrop = backdrop)}
        className="Mention-backdrop"
      >
        {this.props.children}
      </div>
    );
  }
}

class TextInput extends Component {
  /**
   * @property {Object} propTypes
   */
  static defaultProps = {
    autoResize: PropTypes.bool,
    onChange: PropTypes.func,
    onUpdateCoords: PropTypes.func,
    onMention: PropTypes.func,
    onScroll: PropTypes.func,
    onKeyUp: PropTypes.func,
    onKeyPress: PropTypes.func,
    onKeyDown: PropTypes.func,
    onEnter: PropTypes.func,
    value: PropTypes.func,
  };

  /**
   * @property {Object} defaultProps
   */
  static defaultProps = {
    autoResize: false,
    onChange: () => {},
    onUpdateCoords: () => {},
    onMention: () => {},
    onScroll: () => {},
    onKeyUp: () => {},
    onKeyPress: () => {},
    onKeyDown: () => {},
    onEnter: () => {},
    value: () => {},
  };
  /**
   * @param {Object} event
   */
  onChange = event => {
    this.onUpdateCoords();

    this.props.onChange(event.target.value);

    const mentioned = this.getLastWord(event.target);

    const isMatched = /(@\w+)/g.test(mentioned);

    if (mentioned && mentioned.length > 3 && isMatched) {
      this.props.onMention(mentioned);
    } else {
      this.props.onMention(false);
    }
  };

  /**
   * @param {Object} event
   */
  onScroll = event => {
    this.props.onScroll({
      scrollLeft: event.target.scrollLeft,
      scrollTop: event.target.scrollTop,
    });
  };

  /**
   * Gets the last word being modified.
   *
   * @param {Object} textarea
   *
   * @returns {Boolean|String}
   */
  getLastWord(textarea) {
    const lastWord = this.getCurrentText(
      textarea.value,
      this.getCaretPosition(textarea)
    );

    return lastWord ? lastWord : false;
  }

  /**
   * @param {String} text
   * @param {Number} caretPosition
   *
   * @returns {String}
   */
  getCurrentText(text, caretPosition) {
    const preText = text.substring(0, caretPosition);
    if (preText.indexOf(' ') > 0) {
      const words = preText.split(' ');
      const lastWord = words[words.length - 1];
      return lastWord.trim ? lastWord.trim() : lastWord;
    } else {
      return preText.trim ? preText.trim() : preText;
    }
  }

  /**
   * @param {Object} textarea
   *
   * @returns {Number}
   */
  getCaretPosition(textarea) {
    let caretPosition = 0; // IE Support
    if (document.selection) {
      textarea.focus();
      let Sel = document.selection.createRange();
      Sel.moveStart('character', -textarea.value.length);
      caretPosition = Sel.text.length;
    } else if (textarea.selectionStart || textarea.selectionStart === '0')
      // Firefox support
      caretPosition = textarea.selectionStart;
    return caretPosition;
  }

  /**
   * @param {String} value
   */
  replaceText(value) {
    const currentPosition = this.getCaretPosition(this.textarea);
    const prevText = this.props.value.substring(0, currentPosition);

    const textPart1 = prevText.substring(0, prevText.lastIndexOf('@'));
    const textPart2 = this.props.value.substring(
      currentPosition,
      this.props.value.length
    );

    return this.props.onChange(`${textPart1}@${value}${textPart2} `);
  }

  /**
   * Updates mention suggestions coordinates.
   *
   * @returns {void}
   */
  onUpdateCoords() {
    const { left, top } = getCoordinates(
      this.textarea,
      this.textarea.selectionEnd
    );

    let nextTop = top;

    if (this.textarea.scrollHeight > this.textarea.clientHeight) {
      nextTop = top - (this.textarea.scrollHeight - this.textarea.clientHeight);
    }

    this.props.onUpdateCoords({
      left,
      top: nextTop,
    });
  }

  /**
   * @param {Object} event
   */
  onKeyPress = event => {
    this.onScroll(event);

    if (event.keyCode === KEYS.RETURN || event.which === KEYS.RETURN) {
      this.props.onEnter(event);
    } else {
      this.props.onKeyPress(event);
    }
  };

  /**
   * @param {Object} event
   */
  onKeyDown = event => {
    this.onUpdateCoords();
    this.props.onKeyDown(event);
    this.onScroll(event);
  };

  onKeyUp = event => {
    this.props.onKeyUp(event);
    this.onScroll(event);
  };

  /**
   * @returns {Object}
   */
  getCustomStyle() {
    return {
      overflow: this.props.autoResize ? 'hidden' : 'auto',
    };
  }

  /**
   * @returns {void}
   */
  focus = () => this.textarea.focus();

  /**
   * @returns {void}
   */
  blur = () => this.textarea.blur();

  render() {
    return (
      <textarea
        style={this.getCustomStyle()}
        className="Mention-textarea"
        autoFocus={true}
        ref={textarea => (this.textarea = textarea)}
        onChange={this.onChange}
        onPaste={this.onChange}
        onCut={this.onChange}
        onScroll={this.onScroll}
        onKeyPress={this.onKeyPress}
        onKeyDown={this.onKeyDown}
        onKeyUp={this.onKeyUp}
        value={this.props.value}
        spellCheck={false}
      />
    );
  }
}

class TextArea extends Component {
  static propTypes = {
    autoResize: PropTypes.bool,
    value: PropTypes.string,
    suggestions: PropTypes.array,
    height: PropTypes.number,
    width: PropTypes.number,
    onEnter: PropTypes.func,
  };

  /**
   * @property {Object} defaultProps
   */
  static defaultProps = {
    autoResize: false,
    value: '',
    suggestions: [],
    onEnter: () => {},
  };

  /**
   * @property {Object} state
   */
  state = {
    activeSuggestion: 0,
    value: '',
    isMentionOpen: false,
    coords: {
      top: 0,
      left: 0,
    },
    mentions: [],
    height: undefined,
  };

  componentWillReceiveProps(nextProps) {
    this.setState({
      value: nextProps.value || '',
    });
  }

  /**
   * Closes mention suggestions
   */
  closeMention = () => this.onMentionClose();

  /**
   * Opens mention suggestions
   */
  openMention = () => this.onMentionOpen();

  /**
   * Focus to the textarea
   */
  focus = () => this.textarea.focus();

  /**
   * Out focus on the textarea
   */
  blur = () => this.textarea.blur();

  /**
   * Clears the contents
   */
  clearContent = () => {
    this.setState({
      value: '',
    });
  };

  /**
   * @param {String} value
   */
  setContent = value => {
    this.setState({ value });
  };

  /**
   * Handles click outside event for closing suggestions component.
   *
   * @param {Object} evt
   */
  handleClickOutside = evt => {
    this.onMentionClose();
  };

  /**
   * Handle on enter event.
   *
   * @param {Object} event
   */
  onEnter = event => {
    if (this.state.isMentionOpen) {
      event.preventDefault();
      this.selectMentionOnEnter();
      return;
    } else {
      this.props.onEnter(this.state.value);
    }
  };

  /**
   * @param {Object} event
   */
  onKeyUp = event => {
    switch (event.keyCode) {
      case KEYS.ESC: {
        this.state.isMentionOpen && this.onMentionClose();
        break;
      }
      case KEYS.UP: {
        this.state.isMentionOpen && this.updateActiveSuggestion(KEYS.UP);
        break;
      }
      case KEYS.DOWN: {
        this.state.isMentionOpen && this.updateActiveSuggestion(KEYS.DOWN);
        break;
      }
      case KEYS.LEFT: {
        this.state.isMentionOpen && this.onMentionClose();
        break;
      }
      case KEYS.RIGHT: {
        this.state.isMentionOpen && this.onMentionClose();
        break;
      }
      default:
        break;
    }
  };

  /**
   * @param {String} value
   */
  onChange = value => {
    this.setState({
      value,
    });
  };

  /**
   * @param {Object} event
   */
  onScroll = ({ scrollTop, scrollLeft }) => {
    this.backdrop.scroll({ scrollTop, scrollLeft });
  };

  /**
   * Update coords state with debounce.
   *
   * @returns {Function}
   */
  onUpdateCoords = () => {
    return debounce(coords => {
      this.setState({
        coords,
      });
    }, 200);
  };

  /**
   * @param {String} mention
   */
  onMention = mention => {
    if (!mention) {
      this.onMentionClose();
    } else {
      this.onMentionOpen();
    }
  };

  /**
   * @returns {void}
   */
  onMentionOpen = () => {
    this.setState({
      activeSuggestion: 0,
      isMentionOpen: true,
    });
  };

  /**
   * @returns {void}
   */
  onMentionClose = () => {
    this.setState({
      coords: {},
      isMentionOpen: false,
    });
  };

  /**
   * @param {Object} event
   * @param {Object} user
   * @param {Number}
   *
   * @returns {void}
   */
  onMentionSelect = (event, user, index) => {
    this.onMentionClose();
    this.textarea.replaceText(user.value);
    this.onAddMention(user.value);
  };

  /**
   * Add mention to the state then focus on thext area with extra space after.
   *
   * @param {String} value
   *
   * @returns {void}
   */
  onAddMention(value) {
    this.setState(
      {
        mentions: this.state.mentions.concat([`@${value}`]),
      },
      () => {
        this.textarea.focus();
      }
    );
  }

  /**
   * @returns {void}
   */
  selectMentionOnEnter() {
    const user = this.props.suggestions[this.state.activeSuggestion];

    if (user) {
      this.textarea.replaceText(user.value);
      this.onAddMention(user.value);
    }

    this.onMentionClose();
  }

  /**
   * Handles changing of active mention suggestion.
   * If the next active go over the length of the
   * suggestions, Well back to zero. Lesser than zero
   * well go to the last item.
   *
   * @param {String} dir
   *
   * @returns {void}
   */
  updateActiveSuggestion(dir) {
    const nextActive =
      dir === KEYS.UP
        ? this.state.activeSuggestion - 1
        : this.state.activeSuggestion + 1;

    if (
      nextActive > this.props.suggestions.length - 1 ||
      this.props.suggestions.length === 1
    ) {
      return this.setState({
        activeSuggestion: 0,
      });
    }

    if (nextActive < 0) {
      return this.setState({
        activeSuggestion: this.props.suggestions.length - 1,
      });
    }

    this.setState({
      activeSuggestion: nextActive,
    });
  }

  render() {
    return (
      <div
        ref={component => (this.component = component)}
        className="Mention-container"
      >
        <ProxyPre isVisible={this.props.autoResize} value={this.state.value} />

        <Backdrop
          ref={backdrop => (this.backdrop = backdrop)}
          autoResize={this.props.autoResize}
        >
          <Highlighter
            value={this.state.value}
            mentions={this.state.mentions}
          />
        </Backdrop>

        <TextInput
          ref={textarea => (this.textarea = textarea)}
          autoResize={this.props.autoResize}
          onMention={this.onMention}
          onChange={this.onChange}
          onEnter={this.onEnter}
          onKeyUp={this.onKeyUp}
          onScroll={this.onScroll}
          onUpdateCoords={this.onUpdateCoords()}
          value={this.state.value}
        />

        <Suggestions
          active={this.state.activeSuggestion}
          isOpen={this.state.isMentionOpen}
          coords={this.state.coords}
          options={this.props.suggestions}
          onSelect={this.onMentionSelect}
        />
      </div>
    );
  }
}

export default onClickOutside(TextArea);
