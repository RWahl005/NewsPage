const sqlite = require('sqlite3').verbose();

/**
 * Proccess the sql data.
 * @param {*} listOfObjects 
 * @param {*} property 
 */
async function proccess(listOfObjects, property) {
    let clazz = listOfObjects[0].constructor;
    let db = new sqlite.Database(`${property.name}`);
    return proccessData(clazz.name, listOfObjects).then(() => db.close());

    function proccessData(clazzName, listOfObjects) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('drop table if exists ' + clazzName)
                    .run('create table ' + clazzName + '(' + getSQLColumnName(listOfObjects[0]) + ')');
                let times = 1;
                for (let i in listOfObjects) {
                    db.run(`insert into ${clazz.name} values(${getSQLValues(listOfObjects[i])})`, () => {
                        if (times == listOfObjects.length) resolve();
                        else times++;
                    });
                }
            });

        });
    }
}

/**
 * Get the SQLite data.
 * @param {*} clazz 
 * @param {*} properties 
 */
async function get(clazz, properties) {
    let db = new sqlite.Database(`${properties.name}`, sqlite.OPEN_READONLY);
    var get = new Promise((resolve, reject) => {
            var output = [];
            db.all('SELECT * FROM ' + clazz.name, (errors, rows) => {
                if (errors) {
                    reject(errors);
                }
                for (let i in rows) {
                    let obj = new clazz();
                    let keys = Reflect.ownKeys(rows[i]);
                    for (let x in keys) {
                        var value = Reflect.get(rows[i], keys[x]);
                        Reflect.set(obj, keys[x], value);
                    }
                    output.push(obj);
                }
                resolve(output);
            });
        });
    return get.then((output) => {db.close(); return output;});
}

/**
 * Proccess the data and sets the data types.
 * @param {*} exObj The object.
 * @returns a string containing the column titles and types.
 */
function getSQLColumnName(exObj) {
    var keys = Reflect.ownKeys(exObj);
    var output = "";
    for (let i in keys) {
        if (Reflect.get(exObj, keys[i]) === parseInt(Reflect.get(exObj, keys[i]), 10)) { //TODO Replace?
            if (output != "") output += ", " + keys[i] + " INT";
            else output += keys[i] + " INT";
        }
        if (typeof Reflect.get(exObj, keys[i]) === 'string') {
            let value = Reflect.get(exObj, keys[i]);
            if (value.length < 65535) {
                if (output != "") output += ", " + keys[i] + " TEXT";
                else output += keys[i] + " TEXT";
            } else {
                if (output != "") output += ", " + keys[i] + " MEDIUMTEXT";
                else output += keys[i] + " MEDIUMTEXT";
            }
        }
        if (Number(Reflect.get(exObj, keys[i])) === Reflect.get(exObj, keys[i]) && Reflect.get(exObj, keys[i]) % 1 !== 0) {
            if (output != "") output += ", " + keys[i] + " FLOAT";
            else output += keys[i] + " FLOAT";
        }
        if (typeof Reflect.get(exObj, keys[i]) === 'boolean') {
            if (output != "") output += ", " + keys[i] + " BOOLEAN";
            else output += keys[i] + " BOOLEAN";
        }
    }
    return output;
}

/**
 * Format the values to be inserted into the table for SQL.
 * @param {*} obj An example object
 * @returns The string that will be used in the query.
 */
function getSQLValues(obj) {
    var keys = Reflect.ownKeys(obj);
    var output = "";
    for (let i in keys) {
        if (typeof keys[i] === "string") {
            output += "'" + Reflect.get(obj, keys[i]).toString().replace("'", "%$0027$%") + "'";
        } else if (keys[i].constructor.name == "Array") {
            output += generateList(Reflect.get(obj, keys[i]));
        } else
            output += Reflect.get(obj, keys[i]);
        if (keys.length > (parseInt(i) + 1)) output += ", ";
    }
    return output;
}

/**
 * Converts a list into a string to be used.
 * @param {*} list The list
 * @returns The list turned into a string.
 */
function generateList(list) {
    var output = "'RSQLLIST[";
    for (let i in list) {
        output += "`" + list[i].replace("'", "%$0027$%").replace("`", "%$0060$%").replace('"', "%$0022$%").replace("|", "%$007C$%")
            .replace("[", "%$005B$%").replace("]", "%$005D$%");
        if (i < list.size() - 1)
            output += "`|";
    }
    output += "`]'";
    return output;
}

module.exports = {
    proccess: proccess,
    get: get
}