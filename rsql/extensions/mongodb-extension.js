const mongo = require('mongodb').MongoClient;
async function proccess(listOfObjects, props){
    let clazz = listOfObjects[0].constructor;
    let db = await mongo.connect(props.address, { useNewUrlParser: true, useUnifiedTopology: true });
    const dbs = db.db(props.name);
    dbs.collection(clazz.name).removeMany({});
    dbs.collection(clazz.name).insertMany(listOfObjects);
    // dbs.close();
    db.close();
    return;
}

async function get(clazz, props){
    let db = await mongo.connect(props.address, { useNewUrlParser: true });
    const dbs = db.db(props.name);
    let data = await dbs.collection(clazz.name).find({}).toArray();
    let output = [];
    for(let i in data){
        let obj = new clazz();
        for(let x in Reflect.ownKeys(data[i])){
            let key = Reflect.ownKeys(data[i])[x];
            if(key === "_id") continue;
                let value = Reflect.get(data[i], key);
                Reflect.set(obj, key, value);
            }
            output.push(obj);
        }
    db.close();
    // console.log(output);
    // console.log("done");
    return output;
}

module.exports = {
    proccess: proccess,
    get: get
};