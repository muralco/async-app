import { decorate } from '../decorate';
import { internalServerError, notFound } from '../error';
import { Entities, Req as Request } from '../types';

interface LoadAdditionalModels<TEntities extends Entities, TModel> {
  key: string;
  fn: (req: Req<TEntities>, model: TModel) => Promise<void>;
}

type Req<TEntities extends Entities> = Request<TEntities, keyof TEntities>;

interface GetIdFrom<TEntities extends Entities, TId> {
  (req: Req<TEntities>): TId;
  $requires?: string[];
}

export const loadWith = <
  TEntities extends Entities,
  TKey extends keyof TEntities,
  TId extends keyof TEntities[TKey],
>(
  fetch: (id: TEntities[TKey][TId]) => Promise<Req<TEntities>[TKey]>,
  getIdFromModel: (model: Req<TEntities>[TKey]) => TEntities[TKey][TId],
) => (
  getIdFrom: GetIdFrom<TEntities, TEntities[TKey][TId]>,
  storeModelInto: TKey,
  loadAdditionalModels?: LoadAdditionalModels<TEntities, Req<TEntities>[TKey]>,
) => {
  // Async Fn to fetch and store the model.
  const loadModel = async (req: Req<TEntities>) => {
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

    const model = oldModel || await fetch(id);

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
  const $requires = getIdFrom.$requires || [];

  // Return decorated fn with $provides and $requires;
  return decorate({ $provides, $requires }, loadModel);
};
