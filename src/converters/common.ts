import { Converter, Entities, NamedConverter } from '../types';

export const nameConverter = <TEntities extends Entities, TSchema>(
  converter: Converter<TEntities, TSchema>,
  id: string,
): NamedConverter<TEntities, TSchema> => {
  converter.converterId = id;
  return converter as NamedConverter<TEntities, TSchema>;
};
