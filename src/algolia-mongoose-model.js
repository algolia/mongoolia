/* @flow */
import { reduce, omit, find, map, pick, zipWith } from 'lodash';

type AlgoliasearchClientIndex = {
  clearIndex: () => Promise<*>,
  addObject: ({}) => Promise<*>,
  saveObject: ({ objectID: string }) => Promise<*>,
  setSettings: ({}, { forwardToReplicas: boolean }) => Promise<*>,
  search: ({ query: string }) => Promise<*>,
  deleteObject: string => Promise<*>
};

export default function createAlgoliaMongooseModel({
  index,
  attributesToIndex,
  fieldName
}: {
  index: AlgoliasearchClientIndex,
  attributesToIndex: string[],
  fieldName: string
}) {
  class AlgoliaMongooseModel {
    // properties comming from mongoose model after `.loadClass()`
    _id: MongoId;
    // _algoliaObjectID: string;
    collection: { update: ({ _id: MongoId }, {}) => Promise<*> };
    toJSON: () => JSON;

    static schema: { obj: {} };
    static find: ({}, ?{}) => Promise<*>;
    static update: ({}, {}) => Promise<*>;

    // * clears algolia index
    // * removes `fieldName` from documents
    static async clearAlgoliaIndex() {
      await index.clearIndex();
      await this.collection.updateMany(
        { [fieldName]: { $exists: true } },
        { $set: { [fieldName]: null } }
      );
    }

    // * clears algolia index
    // * push collection to algolia index
    static async syncWithAlgolia({ force }: ?{ force: boolean } = {}) {
      if (force === true) await this.clearAlgoliaIndex();

      const docs = await this.find({ [fieldName]: { $eq: null } });
      const { objectIDs } = await index.addObjects(
        docs.map(doc => pick(doc, attributesToIndex))
      );

      return await Promise.all(
        zipWith(docs, objectIDs, (doc, _algoliaObjectID) => {
          doc[fieldName] = _algoliaObjectID;
          return doc.save();
        })
      );
    }

    // * set one or more settings of the algolia index
    static setAlgoliaIndexSettings(settings: {}, forwardToReplicas: boolean) {
      return index.setSettings(settings, { forwardToReplicas });
    }

    // * search the index
    static async algoliaSearch({
      query,
      params,
      populate
    }: {
      query: string,
      params: ?{},
      populate: boolean
    }) {
      const searchParams = { ...params, query };
      const data = await index.search(searchParams);

      // * populate hits with content from mongodb
      if (populate) {
        // find objects into mongodb matching `objectID` from Algolia search
        const hitsFromMongoose = await this.find(
          {
            [fieldName]: { $in: map(data.hits, 'objectID') }
          },
          reduce(
            this.schema.obj,
            (results: {}, val: {}, key: string) => ({ ...results, [key]: 1 }),
            { [fieldName]: 1 }
          )
        );

        // add additional data from mongodb into Algolia hits
        const populatedHits = data.hits.map(hit => {
          const ogHit = find(hitsFromMongoose, {
            [fieldName]: hit.objectID
          });

          return omit(
            {
              ...(ogHit ? ogHit.toJSON() : {}),
              ...hit
            },
            [fieldName]
          );
        });

        data.hits = populatedHits;
      }

      return data;
    }

    // * push new document to algolia
    // * update document with `fieldName`
    async addObjectToAlgolia() {
      const object = pick(this.toJSON(), attributesToIndex);
      const { objectID } = await index.addObject(object);

      this.collection.updateOne(
        { _id: this._id },
        { $set: { [fieldName]: objectID } }
      );
    }

    // * update object into algolia index
    async updateObjectToAlgolia() {
      const object = pick(this.toJSON(), attributesToIndex);
      await index.saveObject({ ...object, objectID: this[fieldName] });
    }

    // * delete object from algolia index
    async deleteObjectFromAlgolia() {
      await index.deleteObject(this[fieldName]);
    }

    // * schema.post('save')
    postSaveHook() {
      if (this[fieldName]) {
        this.updateObjectToAlgolia();
      } else {
        this.addObjectToAlgolia();
      }
    }

    // * schema.post('update')
    postUpdateHook() {
      if (this[fieldName]) {
        this.updateObjectToAlgolia();
      }
    }

    // * schema.post('remove')
    postRemoveHook() {
      if (this[fieldName]) {
        this.deleteObjectFromAlgolia();
      }
    }
  }

  return AlgoliaMongooseModel;
}
