const mysql = require('mysql');

const mongoExt = require('./extensions/mongodb-extension.js');
const sqlite = require('./extensions/sql-extension.js');
const json = require('./extensions/json-extension.js');

/**
 * Generic Properties Class
 */
class Properties {
    constructor(name) {
        this.name = name;
    }
}

/**
 * Put RSQL into JSON mode.
 */
class JSONProperties extends Properties {
    /**
     * Put RSQL into JSON mode.
     * @param {String} name The name of the file (Includes the .json) Ex: test.json
     */
    constructor(name) {
        super(name);
    }
}

class MongoDBProperties extends Properties {
    constructor(properties){
        if(properties.address == null) throw "Error: No address is defined";
        super(properties.address);
        this.data = properties;
    }
}

class MYSQLProperties extends Properties {
    constructor(name, host, user, password) {
        super(name);
        this.host = host;
        this.user = user;
        this.password = password;
        this.decimalType = "FLOAT";
    }
    /**
     * Change the type of decimal that is saved. (Default is FLOAT) (Options are: FLOAT and DOUBLE)
     * @param {*} type 
     */
    setDecimalType(type) {
        this.decimalType = type;
    }
}

/**
 * Put RSQL into SQL mode.
 * Notice: SQL can only run in Async mode. **Sync mode is not an option.**
 */
class SQLiteProperties extends Properties {
    /**
     * Put RSQL into SQL mode.
     * Notice: SQL can only run in Async mode. **Sync mode is not an option.**
     * @param {*} name The name of the database file. Including the .db (Ex: test.db)
     */
    constructor(name) {
        super(name);
        this.decimalType = "FLOAT";
    }
    /**
     * Change the type of decimal that is saved. (Default is FLOAT) (Options are: FLOAT and DOUBLE)
     * @param {*} type 
     */
    setDecimalType(type) {
        this.decimalType = type;
    }
}


/**
 * Handles data returned from async mode.
 */
class Proccessor {
    constructor(instRsql, reason) {
        this.rsql = instRsql;
        this.reason = reason;
    }

    /**
     * Get the instance of the RSQL file.
     */
    getRSQL() {
        return this.rsql;
    }

    /**
     * Get the reason.
     */
    getReason() {
        return this.reason;
    }
}

/**
 * The Main Class that Handles data.
 */
class RSQL {
    /**
     * Configure the format you want the data to be saved in.
     * @param {*} prop 
     */
    constructor(prop) {
        this.property = prop;
        this.asyncActions = [];
        this.limit = 10;
    }

    /**
     * Proccess data in sync form
     * @param {*} listOfObjects The list of objects to return from the processes.
     */
    proccess(listOfObjects) {
        if (this.property instanceof JSONProperties)
            json.proccess(listOfObjects, this.property);
        else if (this.property instanceof MYSQLProperties)
            proccessMYSQL(listOfObjects, this.property);
        else if (this.property instanceof SQLiteProperties) {
            return new Promise((resolve, reject) => {
                sqlite.proccess(listOfObjects, this.property).then(() => {
                    resolve(new Proccessor(this, "Complete"));
                })
            });
        }
        else if(this.property instanceof MongoDBProperties){
            console.log(this.property.data.address);
            return new Promise(async (resolve, reject) => {
                await mongoExt.proccess(listOfObjects, this.property.data)
                resolve(new Proccessor(this, "Complete"));
            });
        }
    }

    /**
     * Proccess Data Asynchronously
     * @param {*} listOfObjects The list of objects to proccess.
     */
    proccessAsync(listOfObjects) {
        const inst = this;
        if (this.property instanceof SQLiteProperties) {
            return new Promise((resolve, reject) => {
                sqlite.proccess(listOfObjects, this.property).then(() => {
                    resolve(new Proccessor(this, "Complete"));
                })
            });
        }
        return new Promise((resolve, reject) => {
            if (inst.asyncActions.length > inst.limit) {
                reject(new Proccessor(null, ProccessStates.LimitReached));
            }
            if (this.property instanceof JSONProperties)
                resolve(new Proccessor(inst, json.proccess(listOfObjects, inst.property)));
        });
    }

    /**
     * Get data in sync.
     * @param {*} clazz The class to get the data for.
     */
    get(clazz) {
        if (this.property instanceof JSONProperties) return json.get(clazz, this.property.name);
        if (this.property instanceof SQLiteProperties) return sqlite.get(clazz, this.property);
        if(this.property instanceof MongoDBProperties) return new Promise((resolve, reject) => {
            resolve(mongoExt.get(clazz, this.property.data))
        });
    }

    /**
     * Get the data Asynchronously
     * @param {*} clazz The class to get the data for.
     */
    getAsync(clazz) {
        return new Promise((resolve, reject) => {
            if (this.property instanceof JSONProperties) {
                var data = json.get(clazz, this.property.name);
                if (data == null)
                    reject("Cannot find data for request class.");
                else
                    resolve(data);
            }
            if(this.property instanceof SQLiteProperties){
                sqlite.get(clazz, this.property).then(data => resolve(data));
            }
        });
    }

    /**
     * Delete the data for the entire class.
     * @param {*} clazz 
     */
    delete(clazz) {
        if (this.asyncActions.length > 0) {
            throw ("Error: Cannot delete synchronously when async proccesses are in motion.");
        }
        var js = fs.readFileSync(this.property.name);
        let data = JSON.parse(js);
        for (let i in data) {
            if (data[i][0] == clazz.name) {
                data.splice(i, 1);
                fs.writeFileSync(this.property.name, JSON.stringify(data), function () {});
                return true;
            }
        }
        return false;
    }

    /**
     * See if a class is currently being written to.
     * @param {*} clazz  
     */
    isBeingProccessed(clazz) {
        for (let i in this.asyncActions) {
            if (this.asyncActions[i][0] == clazz)
                return true;
        }
        return false;
    }
}

/**
 * Proccess the MYSQL data. (Untested)
 * @param {*} listOfObjects 
 * @param {*} property 
 */
function proccessMYSQL(listOfObjects, property) {
    let clazz = listOfObjects[0].constructor;
    let connection = mysql.createConnection({
        host: property.host,
        user: property.user,
        password: property.password,
        database: property.name,
        port: 3306
    });
    connection.connect((e) => console.log(e));
    connection.query('drop table if exists ' + clazz.name);
    connection.query('create table ' + clazz.name + '(' + getSQLColumnName(listOfObjects[0]) + ')');
    for (let i in listOfObjects) {
        connection.query(`insert into ${clazz.name} values(${getSQLValues(listOfObjects[i])})`);
    }

    connection.end();
}




module.exports = {
    RSQL: RSQL,
    JSONProperties: JSONProperties,
    MYSQLProperties: MYSQLProperties,
    SQLiteProperties: SQLiteProperties,
    ProccessStates: json.ProccessStates,
    Proccessor: Proccessor,
    MongoDBProperties: MongoDBProperties
};