/* @flow */

import mongoose from 'mongoose';
import mongoolia from '../index';

describe('mongoolia', () => {
  const schema = new mongoose.Schema({
    indexedAttribute: { type: String, algoliaIndex: true },
    nonIndexedAttribute: { type: String }
  });

  const customSchema = new mongoose.Schema({
    indexedAttribute: { type: String, algoliaIndex: true },
    nonIndexedAttribute: { type: String }
  });

  it('should throw an error if options are missing', () => {
    // $FlowFixMe: We expect to throw, so flow error is expected as well
    expect(() => schema.plugin(mongoolia, {})).toThrowError(/Missing option/);
  });

  describe('extended model', () => {
    schema.plugin(mongoolia, {
      appId: 'foo',
      apiKey: 'foo',
      indexName: 'foo'
    });

    customSchema.plugin(mongoolia, {
      appId: 'foo',
      apiKey: 'foo',
      indexName: 'foo',
      fieldName: 'customFieldName'
    });

    const Model = mongoose.model('Model', schema);

    const CustomModel = mongoose.model('CustomModel', customSchema);

    it('should have additional static methods on model', () => {
      expect(Model.clearAlgoliaIndex).toBeDefined();
      expect(Model.syncWithAlgolia).toBeDefined();
      expect(Model.setAlgoliaIndexSettings).toBeDefined();
      expect(Model.algoliaSearch).toBeDefined();
    });

    it('should have additional instance methods on model', () => {
      const foo = new Model({});
      expect(foo.addObjectToAlgolia).toBeDefined();
      expect(foo.updateObjectToAlgolia).toBeDefined();
      expect(foo.deleteObjectFromAlgolia).toBeDefined();
    });

    it('should add default field name `_algoliaObjectID` on the schema', () => {
      expect(Model.schema.paths).toHaveProperty('_algoliaObjectID');
    });

    it('should add `customFieldName` on the customSchema', () => {
      expect(CustomModel.schema.paths).toHaveProperty('customFieldName');
    });
  });
});
