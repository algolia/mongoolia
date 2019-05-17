/* @flow */
/* eslint no-console: 0 */

import { reduce } from 'lodash';
import algoliasearch from 'algoliasearch';

import createAlgoliaMongooseModel from './algolia-mongoose-model';

type MongooliaOpts = {
  appId: string,
  apiKey: string,
  indexName: string,
};

const validateOpts = options => {
  const requiredKeys = ['appId', 'apiKey', 'indexName'];
  requiredKeys.forEach(key => {
    if (!options[key]) throw new Error(`Missing option key: ${key}`);
  });
};

const mongoolia: Mongoose$SchemaPlugin<MongooliaOpts> = function(
  schema: Mongoose$Schema<any>,
  options: MongooliaOpts
) {
  validateOpts(options);

  // add new Algolia objectID field
  schema.add({
    _algoliaObjectID: { type: String, required: false, select: true },
  });

  // initialize Algolia client
  const { appId, apiKey, indexName } = options;
  const client = algoliasearch(appId, apiKey);
  const index = client.initIndex(indexName);

  // apply AlgoliaIndex class
  const attributesToIndex = reduce(
    schema.obj,
    (results, val, key) => (val.algoliaIndex ? [...results, key] : results),
    []
  );
  schema.loadClass(createAlgoliaMongooseModel({ index, attributesToIndex }));

  // register hooks
  schema.post('save', doc => doc.postSaveHook());
  schema.post('update', doc => doc.postUpdateHook());
  schema.post('remove', doc => doc.postRemoveHook());
};

export default mongoolia;
