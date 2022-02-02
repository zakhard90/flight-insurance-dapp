const fs = require('fs');
const DB = {
    _file: "db.json",
    persistOracle: (obj) => {
        let key = obj.oracle
        let db = fs.readFileSync(_file);
        if (db === undefined || db === "") {
            db = {}
        }

        db[key] = JSON.stringify(obj)

        fs.writeFile(_file, db, 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }
            console.log("JSON file has been saved.");
        });
        return true
    },

    fetchOracle: (key) => {
        let output = null
        let db = fs.readFileSync(_file);
        if (db !== undefined) {
            output = db[key]
        }
        return output
    },

    fetchAllOracles: () => {
        let output = []
        let db = fs.readFileSync(_file);
        if (db !== undefined) {
            for (let key in db) {
                output.push(db[key])
            }
        }
        return output
    }

}
export default DB