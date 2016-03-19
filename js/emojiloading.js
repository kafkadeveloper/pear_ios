var dots = [
  '     ', /* 0 */
  ' ∙   ',
  ' ∙∙  ',
  ' ∙∙∙ ',
  '  ∙∙ ',
  '   ∙ ',
  '     ',
  '     ', /* 7 */
  '   ∙ ',
  '  ∙∙ ',
  ' ∙∙∙ ',
  ' ∙∙  ',
  ' ∙   ',
  '     ',
];

var emojis = [
  '😀',
  '😬',
  '😁',
  '😂',
  '😃',
  '😄',
  '😅',
  '😆',
  '😊',
  '🙂',
  '😋',
  '😌',
  '😜',
  '😝',
  '🤓',
  '😎',
  '😏',
  '😒',
  '🙄',
  '🤔',
  '😯'
];

function getEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function getEmojiLoading(current, counter) {
  var a = current.substring(0, 2);
  var b = current.substring(current.length - 2, current.length);

  if (counter === 0) {
    return emojis[0] + dots[0] + emojis[0];
  } else {
    counter = counter % dots.length;
    if (counter === 0) {
      a = getEmoji();
    } else if (counter === 7) {
      b = getEmoji();
    }

    return a + dots[counter] + b;
  }
}

module.exports = getEmojiLoading;

