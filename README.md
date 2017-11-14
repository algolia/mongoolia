# mongoolia

> Keep your [mongoosejs](http://mongoosejs.com/) schemas synced with [Algolia](http://www.algolia.com)

This plugin will automatically synchronise your models with an Algolia index every time a new document is added, updated or removed.

You can also index your whole collection if you didn't use this plugin when you started using mongoose.

## How to

First install the library:

* `> yarn add mongoolia` OR
* `> npm add mongoolia -S`

Then you need to specify which fields of your schema you want to index with Algolia and register the plugin to your mongoose model created with this schema:

```js
import mongoose from 'mongoose';
import mongoolia from 'mongoolia';

// Pass `{algoliaIndex: true}` to push theses attributes for indexing to Algolia
const BookSchema = new mongoose.Schema({
  title: { type: String, required: true, algoliaIndex: true },
  author: { type: String, required: true, algoliaIndex: true },
  description: { type: String, required: true, algoliaIndex: true }
});

// Specify your Algolia credentials which you can find into your dashboard
BookSchema.plugin(mongoolia, {
  appId: 'xxxxx'
  apiKey: 'xxxx',
  indexName: 'xxxx'
})
```

## Options

| Option name  | Type     | Description
| -            | -        | -
| `appId*`     | `string` | The Algolia application ID
| `apiKey*`    | `string` | The Algolia **admin** API key
| `indexName*` | `string` | The name of the index you want to push data

## Methods

After applying the `mongoolia` plugin to your mongoose model it registers new static methods:

| Method name               | Description
| -                         | -
| `Model.syncWithAlgolia`   | Index the whole collection into your Algolia index.
| `Model.clearAlgoliaIndex` | Clears your Algolia index and remove `_algoliaObjectID` from your documents.
