import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ImageListService } from './image-list.service';
import { DescriptionData } from '../types/description-data.types';
import { ImageData } from '../types/image-data.types';

describe('ImageListService', () => {
  let service: ImageListService;

  function description(text: string): DescriptionData {
    return { description: text, model: 'gpt-4.1', inputTokens: 0, outputTokens: 0, cost: 0 };
  }

  function image(descriptions: DescriptionData[] = [], activeDescriptionIndex = 0): ImageData {
    const id = service.generateId();
    return {
      id, filename: `image-${id}.png`, uploadKey: `upload-${id}`,
      base64Image: 'image', height: 50, width: 100, generating: false,
      descriptions, activeDescriptionIndex
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(ImageListService);
  });

  it('publishes a shallow array copy while preserving membership and image/description identities', () => {
    const desc = description('Original');
    const first = image([desc]);
    const second = image();
    const original = [first, second];
    service.updateImageList(original);
    const emitted = vi.fn();
    const subscription = service.imageList$.subscribe(emitted);

    first.generating = true;
    desc.description = 'Edited';
    service.publishImageList();

    const published = service.imageList;
    expect(published).not.toBe(original);
    expect(published).toEqual([first, second]);
    expect(published[0]).toBe(first);
    expect(published[1]).toBe(second);
    expect(published[0].descriptions).toBe(first.descriptions);
    expect(published[0].descriptions[0]).toBe(desc);
    expect(emitted).toHaveBeenCalledTimes(2);
    expect(emitted).toHaveBeenLastCalledWith(published);
    expect(service.generateId()).toBe(2);
    subscription.unsubscribe();
  });

  it.each([
    { index: 0, nextIndex: 0 },
    { index: 1, nextIndex: 1 },
    { index: 2, nextIndex: 1 }
  ])('publishes deletion at index $index with the corrected active index', ({ index, nextIndex }) => {
    const descriptions = [description('First'), description('Second'), description('Third')];
    const remaining = descriptions.filter((_, i) => i !== index);
    const row = image(descriptions, index);
    const original = [row];
    service.updateImageList(original);
    const emitted = vi.fn();
    const subscription = service.imageList$.subscribe(emitted);

    service.deleteActiveDescription(row);

    expect(row.descriptions).toEqual(remaining);
    expect(row.activeDescriptionIndex).toBe(nextIndex);
    expect(service.imageList).not.toBe(original);
    expect(service.imageList[0]).toBe(row);
    expect(row.descriptions[nextIndex]).toBe(remaining[nextIndex]);
    expect(emitted).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it('publishes deletion of the last description without removing the image', () => {
    const row = image([description('Only description')]);
    service.updateImageList([row]);
    const emitted = vi.fn();
    const subscription = service.imageList$.subscribe(emitted);

    service.deleteActiveDescription(row);

    expect(row.descriptions).toEqual([]);
    expect(row.activeDescriptionIndex).toBe(0);
    expect(service.imageList).toEqual([row]);
    expect(service.imageList[0]).toBe(row);
    expect(emitted).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it.each([-1, 1])('does not publish when active index %s is out of range', index => {
    const row = image([description('Unchanged')], index);
    const original = [row];
    service.updateImageList(original);
    const emitted = vi.fn();
    const subscription = service.imageList$.subscribe(emitted);

    service.deleteActiveDescription(row);

    expect(service.imageList).toBe(original);
    expect(row.descriptions[0].description).toBe('Unchanged');
    expect(emitted).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('does not publish when there is no description to delete', () => {
    const row = image();
    const original = [row];
    service.updateImageList(original);
    const emitted = vi.fn();
    const subscription = service.imageList$.subscribe(emitted);

    service.deleteActiveDescription(row);

    expect(service.imageList).toBe(original);
    expect(emitted).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });
});
