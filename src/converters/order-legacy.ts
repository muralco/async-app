import { Entities } from '../types';
import { getOrderConverter } from './common';

export default function legacyOrderConverter<
  TEntities extends Entities,
  TSchema
>() {
  const converter = getOrderConverter<TEntities, TSchema>();
  return converter;
}
