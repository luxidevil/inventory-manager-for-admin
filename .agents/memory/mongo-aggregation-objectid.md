---
name: MongoDB aggregation ObjectId requirement
description: Mongoose aggregate $match requires ObjectId, not string userId
---

**Rule:** When using `Model.aggregate([{ $match: { fieldName: userId } }])` where `userId` is a string from JWT payload, you must convert it to ObjectId first.

**Correct:**
```ts
import mongoose from "mongoose";
await Sale.aggregate([{ $match: { sellerId: new mongoose.Types.ObjectId(userId) } }]);
```

**Wrong (silently returns empty results or crashes):**
```ts
await Sale.aggregate([{ $match: { sellerId: userId } }]); // string, not ObjectId
```

**Why:** Mongoose auto-converts string to ObjectId in `find()`/`findOne()` but NOT in raw `aggregate()` pipelines. The `$match` stage in aggregation does strict type comparison.

**How to apply:** Always import mongoose and use `new mongoose.Types.ObjectId(id)` in any `aggregate()` `$match` against ObjectId fields.
