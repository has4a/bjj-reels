import { describe, expect, it } from 'vitest';
import { embedUrl, extractLink, parseLink } from '../src/lib/url';

describe('parseLink', () => {
  it('normalizuje reel a odstráni tracking parametre', () => {
    expect(parseLink('https://www.instagram.com/reel/Xy7kQ2ab_9Z/?igsh=MWx0cHNk')).toEqual({
      id: 'Xy7kQ2ab_9Z',
      url: 'https://www.instagram.com/reel/Xy7kQ2ab_9Z/',
      kind: 'reel',
      code: 'Xy7kQ2ab_9Z',
    });
  });

  it('/p/, /reel/, /reels/, bez www a s username dávajú rovnaké id', () => {
    const ids = [
      'https://www.instagram.com/p/Xy7kQ2ab_9Z/',
      'https://instagram.com/reel/Xy7kQ2ab_9Z',
      'https://www.instagram.com/reels/Xy7kQ2ab_9Z/',
      'https://m.instagram.com/someuser/reel/Xy7kQ2ab_9Z/?utm_source=ig_web_copy_link',
      'instagram.com/reel/Xy7kQ2ab_9Z/',
    ].map((u) => parseLink(u)?.id);
    expect(new Set(ids)).toEqual(new Set(['Xy7kQ2ab_9Z']));
  });

  it('shortcode je citlivý na veľkosť písmen', () => {
    expect(parseLink('https://www.instagram.com/reel/abcDEF/')?.id).not.toBe(parseLink('https://www.instagram.com/reel/ABCdef/')?.id);
  });

  it('zdieľací odkaz /share/ dostane vlastné id', () => {
    expect(parseLink('https://www.instagram.com/share/reel/BAGkTwH0Gm/?igsh=x')).toMatchObject({ id: 'share:BAGkTwH0Gm', kind: 'share' });
  });

  it('iné URL normalizuje, nezmysly odmietne', () => {
    expect(parseLink('https://YouTube.com/watch?v=abc&utm_source=x#t=1')).toMatchObject({
      id: 'url:https://youtube.com/watch?v=abc',
      kind: 'other',
    });
    expect(parseLink('nie je to odkaz')).toBeNull();
    expect(parseLink('')).toBeNull();
    expect(parseLink('javascript:alert(1)')).toBeNull();
  });
});

describe('extractLink', () => {
  it('nájde IG odkaz v zdieľanom texte', () => {
    expect(extractLink('Pozri toto https://www.instagram.com/reel/C1a2b3/?igsh=xyz, super!')?.id).toBe('C1a2b3');
  });
  it('uprednostní Instagram pred iným odkazom', () => {
    expect(extractLink('https://example.com/a https://www.instagram.com/p/XYZ/')?.id).toBe('XYZ');
  });
});

describe('embedUrl', () => {
  it('len pre reel/p/tv', () => {
    expect(embedUrl('reel', 'ABC')).toBe('https://www.instagram.com/reel/ABC/embed/');
    expect(embedUrl('share', 'ABC')).toBeNull();
  });
});
