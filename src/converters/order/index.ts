import {
  Entities,
  isProviderMiddleware,
  Middleware,
  NamedConverter,
  ProviderMiddleware,
} from '../../types';
import { nameConverter } from '../common';
import { getOrderConverter } from './common';

export const converterId = 'orderConverterV2';

export interface OrderOptions {
  noStableSort: boolean;
}

const providerOrderMethod = <TEntities extends Entities>(
  providers: ProviderMiddleware<TEntities>[],
  middlewares: Middleware<TEntities>[],
) => {
  // This will return all the providers in the order as they appear in the
  // middlewares list
  return middlewares.filter(
    (m): m is ProviderMiddleware<TEntities> =>
      isProviderMiddleware(m) && providers.includes(m),
  );
};

export default function orderConverter<TEntities extends Entities, TSchema>(
  opts: Partial<OrderOptions> = {},
): NamedConverter<TEntities, TSchema> {
  const { noStableSort } = opts;
  const converter = getOrderConverter<TEntities, TSchema>(
    !noStableSort ? providerOrderMethod : undefined,
  );
  return nameConverter(converter, converterId);
}