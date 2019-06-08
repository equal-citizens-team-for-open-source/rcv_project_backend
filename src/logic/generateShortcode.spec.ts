import generateShortcode from './generateShortcode';

describe.only('generateShortcode', () => {
  it('generates a shortcode', () => {
    const five: string = generateShortcode(5);
    const seven: string = generateShortcode(7);

    expect(five).toHaveLength(5);
    expect(seven).toHaveLength(7);
  });
});
