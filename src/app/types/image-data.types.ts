import { DescriptionData } from './description-data.types';
import { ModelProvider } from '../../assets/config/models';

export type ImageData = {
  id: number;
  filename: string;
  base64Image: string;
  height: number;
  width: number;
  descriptions: DescriptionData[];
  activeDescriptionIndex: number;
  generating: boolean;
  filesApiId?: string;
  filesApiUri?: string;
  mimeType?: string;
  filesApiProvider?: ModelProvider;
}
