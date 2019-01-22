import { decorate } from '../decorate';
import { internalServerError, notFound } from '../error';
import { Entities, Req as Request } from '../types';

interface LoadAdditionalModels<TEntities extends Entities, TModel> {
  key: string;
  fn: (req: Req<TEntities>, model: TModel) => Promise<void>;
}

type Req<TEntities extends Entities> = Request<TEntities, keyof TEntities>;

interface Requires { $requires?: string[]; }

interface GetIdFrom<TEntities extends Entities, TId> extends Requires {
  (req: Req<TEntities>): TId;
}

interface GetModelFrom<
  TEntities extends Entities,
  TKey extends keyof TEntities,
> extends Requires {
  (req: Req<TEntities>): Promise<Req<TEntities>[TKey]>;
}

interface GetModelById<
  TEntities extends Entities,
  TKey extends keyof TEntities,
  TId extends keyof TEntities[TKey],
> {
  (id: TEntities[TKey][TId]): Promise<Req<TEntities>[TKey] | null>;
}

export const loadFromRequest = <
  TEntities extends Entities,
  TKey extends keyof TEntities,
>(
  getModelFromRequest: GetModelFrom<TEntities, TKey>,
  storeModelInto: TKey,
  loadAdditionalModels?: LoadAdditionalModels<TEntities, Req<TEntities>[TKey]>,
) => {
  // Async Fn to fetch and store the model.
  const loadModel = async (req: Req<TEntities>) => {
    const model = await getModelFromRequest(req);

    if (!model) throw notFound(`${storeModelInto}`.toUpperCase());

    req[storeModelInto] = model;

    // Load additional models i.e workspace
    if (loadAdditionalModels) {
      await loadAdditionalModels.fn(req, model);
    }
  };

  // Decorate properties.
  // Add $provides and $requires to order middlewares.
  const $provides = loadAdditionalModels
    ? [`${storeModelInto}`, loadAdditionalModels.key]
    : [`${storeModelInto}`];
  const $requires = getModelFromRequest.$requires || [];

  // Return decorated fn with $provides and $requires;
  return decorate({ $provides, $requires }, loadModel);
};

export const fetchOnce = <
  TEntities extends Entities,
  TKey extends keyof TEntities,
  TId extends keyof TEntities[TKey],
>(
  fetch: GetModelById<TEntities, TKey, TId>,
  getIdFromModel: (model: Req<TEntities>[TKey]) => TEntities[TKey][TId],
  getIdFrom: GetIdFrom<TEntities, TEntities[TKey][TId]>,
  storeModelInto: TKey,
) => {
  const load: GetModelFrom<TEntities, TKey> = async (req) => {
    const id = getIdFrom(req);
    const oldModel = req[storeModelInto];

    // Invalid model stored in [storeModelInto] key
    if (oldModel && getIdFromModel(oldModel) !== id) {
      throw internalServerError('INVALID_MODEL_ID', {
        actualId: getIdFromModel(oldModel),
        expectedId: id,
        modelTarget: storeModelInto,
      });
    }

    return oldModel || await fetch(id);
  };
  load.$requires = getIdFrom.$requires;
  return load;
};

export const loadWith = <
  TEntities extends Entities,
  TKey extends keyof TEntities,
  TId extends keyof TEntities[TKey],
>(
  fetch: GetModelById<TEntities, TKey, TId>,
  getIdFromModel: (model: Req<TEntities>[TKey]) => TEntities[TKey][TId],
) => (
  getIdFrom: GetIdFrom<TEntities, TEntities[TKey][TId]>,
  storeModelInto: TKey,
  loadAdditionalModels?: LoadAdditionalModels<TEntities, Req<TEntities>[TKey]>,
) =>
  loadFromRequest(
    fetchOnce(fetch, getIdFromModel, getIdFrom, storeModelInto),
    storeModelInto,
    loadAdditionalModels,
  );
