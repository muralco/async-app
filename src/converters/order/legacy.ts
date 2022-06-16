import { Entities } from '../../types';
import { getOrderConverter } from './common';

export const converterId = 'orderConverterV1';

export default function legacyOrderConverter<
  TEntities extends Entities,
  TSchema
>() {
  const converter = getOrderConverter<TEntities, TSchema>();
  converter.converterId = converterId;
  return converter;
}
