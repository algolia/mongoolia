/* eslint no-console: 0 */

import mongoose from 'mongoose';

import mongoolia from './src/index';

mongoose.Promise = global.Promise;

mongoose.connect(`mongodb://localhost/mongoolia-test`, {
  useMongoClient: true,
});

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true, algoliaIndex: true },
  author: { type: String, required: true, algoliaIndex: true },
  description: { type: String, required: true, algoliaIndex: true },
});

BookSchema.plugin(mongoolia, {
  appId: 'DQILAOD1SE',
  apiKey: 'e70bfffdf6ded035e32241c21113c7bd',
  indexName: 'books',
});

const Book = mongoose.model('Book', BookSchema);

(async () => {
  // await Book.remove({}).exec();
  // await Book.clearAlgoliaIndex();
  //
  // const book = new Book({
  //   title: 'foo',
  //   author: 'bar',
  //   description: 'foobar',
  // });
  //
  // await book.save();
  await Book.syncWithAlgolia();
  console.log('done!');
})();
