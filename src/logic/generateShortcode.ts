const letters: string[] = [
  'b',
  'c',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  'm',
  'n',
  'p',
  'q',
  'r',
  's',
  't',
  'v',
  'w',
  'y',
  'z',
];

const generateShortcode = (len: number): string => {
  const choiceLength = letters.length;
  let st: string = '';
  while (st.length < len) {
    st += letters[Math.floor(Math.random() * choiceLength)];
  }
  return st;
};

export default generateShortcode;
