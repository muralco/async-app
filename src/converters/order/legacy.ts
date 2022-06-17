import { Entities, NamedConverter } from '../../types';
import { nameConverter } from '../common';
import { getOrderConverter } from './common';

export const converterId = 'orderConverterV1';

export default function legacyOrderConverter<
  TEntities extends Entities,
  TSchema
>(): NamedConverter<TEntities, TSchema> {
  const converter = getOrderConverter<TEntities, TSchema>();
  return nameConverter(converter, converterId);
}
