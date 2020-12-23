# mongoolia

> Keep your [mongoosejs](http://mongoosejs.com/) schemas synced with [Algolia](http://www.algolia.com)

This plugin will automatically synchronise your models with an Algolia index every time a new document is added, updated or removed.

You can also index your whole collection if you didn't use this plugin when you started using mongoose.

## How to

**Only supports mongoose v4**

First install the library:

* `> yarn add mongoolia` OR
* `> npm add mongoolia -S`

Then you need to specify which fields of your schema you want to index with Algolia and register the plugin to your mongoose model created with this schema:

```js
// ES6
import mongoose from 'mongoose';
import mongoolia from 'mongoolia';

// ES5
const mongoose = require('mongoose');
const mongoolia = require('mongoolia').default;

// Pass `{algoliaIndex: true}` to push theses attributes for indexing to Algolia
const BookSchema = new mongoose.Schema({
  title: { type: String, required: true, algoliaIndex: true },
  author: { type: String, required: true, algoliaIndex: true },
  description: { type: String, required: true, algoliaIndex: true }
});

// Specify your Algolia credentials which you can find into your dashboard
BookSchema.plugin(mongoolia, {
  appId: 'xxxxx',
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

#### `Model.syncWithAlgolia(): Promise`
Index the whole collection into your Algolia index.

#### `Model.clearAlgoliaIndex(): Promise`
Clears your Algolia index and remove `_algoliaObjectID` from your documents.

#### `Model.setAlgoliaIndexSettings(settings: {}, forwardToReplicas: boolean): Promise`
Set one or more settings of the Algolia index, the full settings list is available [here](https://www.algolia.com/doc/api-reference/settings-api-parameters/).

#### `Model.algoliaSearch({ query: string, params?: {}, populate?: boolean }): Promise`
Search into your Algolia index for a specific query. You can customize the search parameters as well.

You can find the full list of search parameters [here](https://www.algolia.com/doc/api-reference/api-parameters/), you should look for settings tagged with `search`.

The server response will look like:

```json
{
  "hits": [
    {
      "firstname": "Jimmie",
      "lastname": "Barninger",
      "objectID": "433",
      "_highlightResult": {
        "firstname": {
          "value": "<em>Jimmie</em>",
          "matchLevel": "partial"
        },
        "lastname": {
          "value": "Barninger",
          "matchLevel": "none"
        },
        "company": {
          "value": "California <em>Paint</em> & Wlpaper Str",
          "matchLevel": "partial"
        }
      }
    }
  ],
  "page": 0,
  "nbHits": 1,
  "nbPages": 1,
  "hitsPerPage": 20,
  "processingTimeMS": 1,
  "query": "jimmie paint",
  "params": "query=jimmie+paint&attributesToRetrieve=firstname,lastname&hitsPerPage=50"
}
```
