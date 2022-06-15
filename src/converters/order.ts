import {
  Converter,
  Entities,
} from '../types';
import { getOrderConverter } from './common';

export const converterId = 'orderConverterV2';

export default function orderConverter<
  TEntities extends Entities,
  TSchema
>(): Converter<TEntities, TSchema> {
  const converter = getOrderConverter<TEntities, TSchema>();
  converter.converterId = converterId;
  return converter;
}
