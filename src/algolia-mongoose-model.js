/* @flow */
import { pick } from 'lodash';

type AlgoliasearchClientIndex = {
  clearIndex: () => Promise<*>,
  addObject: ({}) => Promise<*>,
  saveObject: ({ objectID: string }) => Promise<*>,
  deleteObject: string => Promise<*>,
};

export default function createAlgoliaMongooseModel({
  index,
  attributesToIndex,
}: {
  index: AlgoliasearchClientIndex,
  attributesToIndex: string[],
}) {
  class AlgoliaMongooseModel {
    // properties comming from mongoose model after `.loadClass()`
    _id: MongoId;
    _algoliaObjectID: string;
    collection: { update: ({ _id: MongoId }, {}) => Promise<*> };
    toJSON: () => JSON;

    static find: ({}) => Promise<*>;
    static update: ({}, {}) => Promise<*>;

    // * clears algolia index
    // * removes `_algoliaObjectID` from documents
    static async clearAlgoliaIndex() {
      await index.clearIndex();
      await this.update(
        { _algoliaObjectID: { $exists: true } },
        { $set: { _algoliaObjectID: null } }
      );
    }

    // * clears algolia index
    // * push collection to algolia index
    static async syncWithAlgolia() {
      await this.clearAlgoliaIndex();

      const docs = await this.find({ _algoliaObjectID: { $eq: null } });
      await Promise.all(docs.map(doc => doc.pushToAlgolia()));
    }

    // * push new document to algolia
    // * update document with `_algoliaObjectID`
    async addObjectToAlgolia() {
      const object = pick(this.toJSON(), attributesToIndex);
      const { objectID } = await index.addObject(object);

      this.collection.update(
        { _id: this._id },
        { $set: { _algoliaObjectID: objectID } }
      );
    }

    // * update object into algolia index
    async updateObjectToAlgolia() {
      const object = pick(this.toJSON(), attributesToIndex);
      await index.saveObject({ ...object, objectID: this._algoliaObjectID });
    }

    // * delete object from algolia index
    async deleteObjectFromAlgolia() {
      await index.deleteObject(this._algoliaObjectID);
    }

    // * schema.post('save')
    postSaveHook() {
      if (this._algoliaObjectID) {
        this.updateObjectToAlgolia();
      } else {
        this.addObjectToAlgolia();
      }
    }

    // * schema.post('update')
    postUpdateHook() {
      if (this._algoliaObjectID) {
        this.updateObjectToAlgolia();
      }
    }

    // * schema.post('remove')
    postRemoveHook() {
      if (this._algoliaObjectID) {
        this.deleteObjectFromAlgolia();
      }
    }
  }

  return AlgoliaMongooseModel;
}
