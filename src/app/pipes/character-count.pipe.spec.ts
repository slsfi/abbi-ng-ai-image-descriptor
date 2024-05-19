import { CharacterCountPipe } from './character-count.pipe';

describe('CharacterCountPipe', () => {
  it('create an instance', () => {
    const pipe = new CharacterCountPipe();
    expect(pipe).toBeTruthy();
  });
});
