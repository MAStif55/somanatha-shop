const { MongoClient } = require('mongodb');
async function check() {
  const c = new MongoClient('mongodb://127.0.0.1:27017');
  await c.connect();
  const db = c.db('somanatha_data');
  const p = await db.collection('products').find().sort({createdAt: -1}).limit(1).toArray();
  console.log(JSON.stringify(p, null, 2));
  await c.close();
}
check();
