import { DescriptionData } from './description-data.types';

export type ImageData = {
  id: number;
  filename: string;
  base64Image: string;
  height: number;
  width: number;
  descriptions: DescriptionData[];
  activeDescriptionIndex: number;
  generating: boolean;
}
