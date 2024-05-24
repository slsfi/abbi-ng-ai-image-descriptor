import { descriptionData } from './description-data.types';

export type imageData = {
  id: number;
  filename: string;
  base64Image: string;
  height: number;
  width: number;
  descriptions: descriptionData[];
  activeDescriptionIndex: number;
  generating: boolean;
}
