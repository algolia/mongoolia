/* @flow */
/* eslint no-console: 0 */

import { reduce, pick } from 'lodash';
import algoliasearch from 'algoliasearch';

type MongooliaOpts = {
  appId: string,
  apiKey: string,
  indexName: string,
};

type AlgoliasearchClientIndex = {
  clearIndex: () => Promise<*>,
  addObject: ({}) => Promise<*>,
  saveObject: ({ objectID: string }) => Promise<*>,
  deleteObject: string => Promise<*>,
};

const validateOpts = options => {
  const requiredKeys = ['appId', 'apiKey', 'indexName'];
  requiredKeys.forEach(key => {
    if (!options[key]) throw new Error(`Missing option key: ${key}`);
  });
};

const catchErr = errorMessage => err => {
  console.error(errorMessage);
  console.error(err);
};

const getAlgoliaIndexClass = ({
  index,
  attributesToIndex,
}: {
  index: AlgoliasearchClientIndex,
  attributesToIndex: string[],
}) =>
  class AlgoliaIndex {
    // methods coming from mongoose model after `.loadClass()`
    toJSON: () => JSON;

    collection: { update: ({ _id: MongoId }, {}) => Promise<*> };
    _id: MongoId;
    _algoliaObjectID: string;

    static find: ({}) => Promise<*>;
    static update: ({}, {}) => Promise<*>;

    static async clearAlgoliaIndex() {
      await index.clearIndex();
      await this.update(
        { _algoliaObjectID: { $exists: true } },
        { $set: { _algoliaObjectID: null } }
      );
    }

    static async syncWithAlgolia() {
      // clear index
      await this.clearAlgoliaIndex();

      // index and update whole collection
      const docs = await this.find({ _algoliaObjectID: { $eq: null } });
      await Promise.all(docs.map(doc => doc.pushToAlgolia()));
    }

    pushToAlgolia() {
      return index
        .addObject(pick(this.toJSON(), attributesToIndex))
        .then(({ objectID }) => {
          this.collection
            .update(
              { _id: this._id },
              { ...this.toJSON(), _algoliaObjectID: objectID }
            )
            .catch(catchErr('Failed add new object to Algolia index'));
        });
    }

    updateToAlgolia() {
      return index
        .saveObject({
          ...pick(this.toJSON(), attributesToIndex),
          objectID: this._algoliaObjectID,
        })
        .catch(catchErr('Failed to update object to Algolia index'));
    }

    removeFromAlgolia() {
      return index
        .deleteObject(this._algoliaObjectID)
        .catch(catchErr('Failed to remove object from Algolia index'));
    }
  };

function mongoolia(schema: Mongoose$Schema<any>, options: MongooliaOpts) {
  validateOpts(options);

  // add new Algolia objectID field
  schema.add({ _algoliaObjectID: { type: String, required: false } });

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
  schema.loadClass(getAlgoliaIndexClass({ index, attributesToIndex }));

  schema.post('save', function(doc) {
    // not into algolia index yet
    if (!this._algoliaObjectID) {
      doc.pushToAlgolia();
    }

    // already into algolia, update the document
    if (this._algoliaObjectID) {
      doc.updateToAlgolia();
    }
  });

  schema.post('update', function(doc) {
    if (this._algoliaObjectID) {
      doc.updateToAlgolia();
    }
  });

  schema.post('remove', function(doc) {
    if (this._algoliaObjectID) {
      doc.removeFromAlgolia();
    }
  });
}

export default mongoolia;
