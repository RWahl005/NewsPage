const fs = require('fs');

/**
 * The states at which a proccess can be completed or failed with.
 */
const ProccessStates = {
    CreatedSuccess: "Created_Success",
    Success: "Success",
    LimitReached: "Limit_Reached"
}

/**
 * Function to get data in JSON
 * @param {*} clazz 
 * @param {*} name 
 */
function get(clazz, name) {
    var data = fs.readFileSync(name);
    var json = JSON.parse(data);
    for (let i in json) {
        if (json[i][0] == clazz.name) {
            var objList = [];
            for (let x in json[i][1]) {
                let obj = new clazz();
                for (let prop in Reflect.ownKeys(json[i][1][x])) {
                    let curProp = Reflect.ownKeys(json[i][1][x])[prop];
                    let curPropValue = Reflect.get(json[i][1][x], curProp);
                    Reflect.set(obj, curProp, curPropValue);
                }
                objList.push(obj);
            }
            return objList;
        }
    }
    return null;
}

/**
 * function to proccess the JSON data
 * @param {*} listOfObjects 
 * @param {*} property 
 */
function proccess(listOfObjects, property) {
    let clazz = listOfObjects[0].constructor;
    if (!fs.existsSync(property.name)) {
        var objs = [
            [clazz.name, listOfObjects]
        ];
        fs.writeFileSync(property.name, JSON.stringify(objs), function () {});
        return ProccessStates.CreatedSuccess;
    }
    var data = fs.readFileSync(property.name);
    var js = JSON.parse(data);
    for (let i in js) {
        if (js[i][0] == clazz.name) {
            js.splice(i, 1);
            js.push([clazz.name, listOfObjects]);
            fs.writeFileSync(property.name, JSON.stringify(js), function () {});
            return ProccessStates.Success;
        }
    }
    js.push([clazz.name, listOfObjects]);
    fs.writeFileSync(property.name, JSON.stringify(js), function () {});
    return ProccessStates.Success;
}

module.exports = {
    proccess: proccess,
    get: get,
    ProccessStates: ProccessStates
}